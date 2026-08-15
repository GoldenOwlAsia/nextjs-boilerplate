/**
 * Single read point for environment variables.
 *
 * Deliberately dependency-free: this module ends up in the client bundle, and a
 * schema library here would ship ~12kB to every visitor to check three strings.
 * Validation lives in `env.validate.ts`, which runs once on server boot via
 * `src/instrumentation.ts` — see docs/tooling.md.
 *
 * `process.env.X` must stay a literal member expression: Next.js inlines those
 * at build time, and only those.
 */

/** Browser-side base URL. Relative by default — requests go through `app/api/[...path]`. */
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

const isAbsolute = (value: string) => /^https?:\/\//.test(value);

export const env = {
  apiBaseUrl,

  /**
   * Backend origin used by the server: Server Components, prefetch, and the
   * proxy route. Must be absolute — SSR has no origin to resolve against — and
   * must point at the backend, never back at this app.
   */
  serverApiBaseUrl:
    process.env.API_BASE_URL ?? (isAbsolute(apiBaseUrl) ? apiBaseUrl : 'http://localhost:8080'),

  /** Canonical origin of this app. Used for metadata, OG images, sitemaps. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',

  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
} as const;
