import { type NextRequest } from 'next/server';

import { env } from '@/shared/config/env';

/**
 * Backend-for-frontend proxy.
 *
 * The browser talks to `/api/*` and never learns the backend's origin; cookies
 * stay first-party, so there is no CORS and no token in `localStorage`. Server
 * Components skip this hop entirely — they call the backend directly through
 * `getServerApi()`.
 *
 * Deliberately built on `fetch`, not the axios client: this is transport
 * plumbing, and it must not inherit interceptors that reshape errors.
 */
export const dynamic = 'force-dynamic';

/** Headers that describe a single hop and must not be forwarded. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  // Rewritten by fetch on both sides — forwarding stale values corrupts the body.
  'content-length',
  'content-encoding',
  'host',
]);

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

/**
 * Exported for testing. Rejects anything that would let a caller aim the proxy
 * somewhere other than the configured backend.
 */
export const resolveProxyTarget = (
  backendBaseUrl: string,
  segments: string[],
  search: string,
  requestOrigin: string,
): URL => {
  if (segments.some((segment) => segment === '..' || segment === '.')) {
    throw new Error('Path traversal is not allowed');
  }

  const base = backendBaseUrl.replace(/\/+$/, '');
  const target = new URL(`${base}/${segments.join('/')}`);

  if (target.origin === requestOrigin) {
    throw new Error(
      `API_BASE_URL (${backendBaseUrl}) points back at this app — the proxy would call itself. ` +
        'Point it at the backend.',
    );
  }

  target.search = search;

  return target;
};

const filterHeaders = (headers: Headers): Headers => {
  const result = new Headers();

  headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) result.append(key, value);
  });

  return result;
};

const proxy = async (request: NextRequest, context: RouteContext<'/api/[...path]'>) => {
  const { path } = await context.params;

  let target: URL;

  try {
    target = resolveProxyTarget(
      env.serverApiBaseUrl,
      path,
      new URL(request.url).search,
      request.nextUrl.origin,
    );
  } catch (error) {
    console.error('[api proxy]', error);

    return Response.json({ message: 'Proxy is misconfigured' }, { status: 500 });
  }

  // Buffered rather than streamed: streaming a request body needs `duplex:
  // 'half'` and rules out retries. Switch to `request.body` if you upload
  // anything large.
  const body = METHODS_WITHOUT_BODY.has(request.method) ? undefined : await request.arrayBuffer();

  try {
    const response = await fetch(target, {
      method: request.method,
      headers: filterHeaders(request.headers),
      // Spread rather than `body: undefined` — `exactOptionalPropertyTypes`
      // treats an explicit undefined as a real value, and `RequestInit.body`
      // does not accept one.
      ...(body === undefined ? {} : { body }),
      redirect: 'manual',
      cache: 'no-store',
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: filterHeaders(response.headers),
    });
  } catch (error) {
    console.error('[api proxy] upstream request failed', error);

    return Response.json({ message: 'Upstream request failed' }, { status: 502 });
  }
};

export {
  proxy as DELETE,
  proxy as GET,
  proxy as HEAD,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT,
};
