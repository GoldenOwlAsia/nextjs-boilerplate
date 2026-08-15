/**
 * Single read point for environment variables.
 *
 * Nothing else in the codebase touches `process.env` — that keeps the list of
 * variables the app depends on visible in one file, and makes it trivial to swap
 * in schema validation (zod/valibot) later without touching call sites.
 */
export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;
