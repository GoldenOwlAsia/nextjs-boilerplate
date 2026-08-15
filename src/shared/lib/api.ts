import axios, { type AxiosError, type AxiosInstance } from 'axios';

import { env } from '@/shared/config/env';
import { type ApiErrorPayload } from '@/shared/types/api';

/**
 * Every failure that leaves this module is an `ApiError`, so callers — query
 * `onError`, error boundaries, form handlers — never have to know that axios is
 * the transport. Swapping axios for fetch later is a change to this file only.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: Record<string, string[]> | undefined;

  // `| undefined` on the optional fields is required by
  // `exactOptionalPropertyTypes`: callers pass keys whose value may be undefined.
  constructor(params: {
    status: number;
    message: string;
    code?: string | undefined;
    details?: Record<string, string[]> | undefined;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }

  /** Retrying these is pointless — the request itself is the problem. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

const NETWORK_ERROR_STATUS = 0;

const toApiError = (error: AxiosError<ApiErrorPayload>): ApiError => {
  const { response } = error;

  if (!response) {
    return new ApiError({
      status: NETWORK_ERROR_STATUS,
      message: error.message || 'Network error',
      code: error.code,
    });
  }

  return new ApiError({
    status: response.status,
    message: response.data?.message ?? error.message,
    code: response.data?.code,
    details: response.data?.details,
  });
};

export const createApiClient = (baseURL: string = env.apiBaseUrl): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) =>
      Promise.reject(axios.isAxiosError(error) ? toApiError(error) : (error as Error)),
  );

  return client;
};

/**
 * Shared instance. Attach auth headers here (or in a module-level interceptor)
 * rather than in individual `*.api.ts` fetchers.
 */
export const api = createApiClient();
