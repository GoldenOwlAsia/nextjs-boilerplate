/**
 * Transport-level contracts shared by every domain.
 *
 * Domain payloads never live here — they belong to `modules/<domain>/types.ts`.
 */

/** Envelope the backend wraps every successful response in. */
export type ApiResponse<T> = {
  data: T;
  message?: string;
};

/** Error body the backend returns on 4xx/5xx. */
export type ApiErrorPayload = {
  message?: string;
  code?: string;
  /** Field-level validation errors, keyed by field name. */
  details?: Record<string, string[]>;
};
