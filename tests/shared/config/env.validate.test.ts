import { afterEach, describe, expect, it, vi } from 'vitest';

import { validateEnv } from '@/shared/config/env.validate';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('validateEnv', () => {
  it('accepts an empty environment — every variable has a default', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', undefined);
    vi.stubEnv('API_BASE_URL', undefined);

    expect(() => validateEnv()).not.toThrow();
  });

  it('accepts a root-relative public base URL', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '/api');

    expect(() => validateEnv()).not.toThrow();
  });

  it('rejects a public base URL that is neither absolute nor root-relative', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'api.example.com');

    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
  });

  it('rejects a relative server base URL — SSR has no origin', () => {
    vi.stubEnv('API_BASE_URL', '/api');

    expect(() => validateEnv()).toThrow(/API_BASE_URL/);
  });
});
