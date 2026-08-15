/**
 * Envelope returned by the backend for every endpoint.
 *
 * Keep this file free of domain-specific shapes — those live in
 * `modules/<domain>/types.ts` or `features/<feature>/types.ts`.
 */
export type ApiResponse<T> = {
  data: T;
  message?: string;
  error?: string;
};

export type ApiError = {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, string[]>;
};
