import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import { ApiError, createApiClient } from '@/shared/lib/api';

/**
 * Drives the real client through its own interceptor chain by swapping the
 * transport adapter — no mocking of our own code, so these tests still hold if
 * the error handling moves around inside the module.
 */
const clientWithAdapter = (adapter: AxiosAdapter) => {
  const client = createApiClient('http://example.test');
  client.defaults.adapter = adapter;

  return client;
};

/** What a real adapter does for a non-2xx status: reject, carrying the response. */
const clientFailingWith = (status: number, data: unknown) =>
  clientWithAdapter(async (config) => {
    const response = { status, statusText: '', data, headers: {}, config } as AxiosResponse;

    throw new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      response,
    );
  });

describe('api client error normalisation', () => {
  it('turns an HTTP error response into an ApiError carrying the payload', async () => {
    const client = clientFailingWith(422, {
      message: 'Validation failed',
      code: 'VALIDATION',
      details: { email: ['taken'] },
    });

    const error = await client.get('/trips').catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      message: 'Validation failed',
      code: 'VALIDATION',
      details: { email: ['taken'] },
    });
    expect((error as ApiError).isClientError).toBe(true);
  });

  it('reports a request that never got a response as status 0', async () => {
    const client = clientWithAdapter(async (config) => {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    });

    const error = await client.get('/trips').catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, message: 'Network Error', code: 'ERR_NETWORK' });
    expect((error as ApiError).isClientError).toBe(false);
  });

  it('falls back to the axios message when the body carries none', async () => {
    const client = clientFailingWith(500, {});

    const error = await client.get('/trips').catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, message: 'Request failed with status code 500' });
    expect((error as ApiError).isClientError).toBe(false);
  });

  it('passes non-axios errors through untouched', async () => {
    const original = new TypeError('unrelated');
    const client = clientWithAdapter(async () => {
      throw original;
    });

    const error = await client.get('/trips').catch((thrown: unknown) => thrown);

    expect(error).toBe(original);
  });
});
