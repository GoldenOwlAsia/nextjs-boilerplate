import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

import { env } from '@/shared/config/env';
import { createApiClient } from '@/shared/lib/api';

/**
 * Server-side API client.
 *
 * `withCredentials` means nothing on the server — there is no cookie jar — so an
 * authenticated call from a Server Component must forward the incoming request's
 * cookies explicitly. Forgetting this is the classic "works in the browser,
 * returns 401 during SSR" bug.
 *
 * `cache()` scopes the instance to one request: same client for every caller in
 * a render pass, never shared across requests.
 */
export const getServerApi = cache(async () => {
  if (!/^https?:\/\//.test(env.serverApiBaseUrl)) {
    throw new Error(
      `Server API base URL must be absolute, got "${env.serverApiBaseUrl}". ` +
        'Set API_BASE_URL — a relative URL has no origin to resolve against during SSR.',
    );
  }

  const client = createApiClient(env.serverApiBaseUrl);
  const cookieHeader = (await cookies()).toString();

  if (cookieHeader) {
    client.defaults.headers.common['Cookie'] = cookieHeader;
  }

  return client;
});
