import { describe, expect, it } from 'vitest';

import { resolveProxyTarget } from '@/app/api/[...path]/route';

// Mirrors src/app/api/[...path]/route.ts

const ORIGIN = 'http://localhost:3000';

describe('resolveProxyTarget', () => {
  it('joins the backend base URL with the request path and query', () => {
    const target = resolveProxyTarget('http://backend:8080/v1', ['trips', '42'], '?page=2', ORIGIN);

    expect(target.toString()).toBe('http://backend:8080/v1/trips/42?page=2');
  });

  it('tolerates a trailing slash on the base URL', () => {
    const target = resolveProxyTarget('http://backend:8080/', ['trips'], '', ORIGIN);

    expect(target.toString()).toBe('http://backend:8080/trips');
  });

  it('refuses path traversal that would escape the backend base path', () => {
    expect(() => resolveProxyTarget('http://backend:8080/v1', ['..', 'admin'], '', ORIGIN)).toThrow(
      /traversal/i,
    );
  });

  it('refuses to call the app itself — a misconfigured API_BASE_URL would loop', () => {
    expect(() => resolveProxyTarget(`${ORIGIN}/api`, ['trips'], '', ORIGIN)).toThrow(
      /points back at this app/i,
    );
  });
});
