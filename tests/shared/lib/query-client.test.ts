import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/lib/api';
import { shouldRetryQuery } from '@/shared/lib/query-client';

describe('shouldRetryQuery', () => {
  it('does not retry client errors — the request itself is the problem', () => {
    expect(shouldRetryQuery(0, new ApiError({ status: 422, message: 'Invalid' }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError({ status: 404, message: 'Missing' }))).toBe(false);
  });

  it('retries server errors up to the limit', () => {
    const error = new ApiError({ status: 503, message: 'Unavailable' });

    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(false);
  });

  it('retries network failures, which carry no status', () => {
    expect(shouldRetryQuery(0, new ApiError({ status: 0, message: 'Network error' }))).toBe(true);
  });

  it('retries unknown errors rather than swallowing them', () => {
    expect(shouldRetryQuery(0, new Error('boom'))).toBe(true);
  });
});
