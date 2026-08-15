/**
 * Declaring env vars explicitly does two things: it documents every variable the
 * app reads, and it lets `process.env.X` typecheck under
 * `noPropertyAccessFromIndexSignature` (a bare index signature would force
 * `process.env['X']`, which Next.js cannot inline at build time).
 *
 * Only `NEXT_PUBLIC_*` variables reach the browser bundle.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    /** Base URL used by the browser. Relative by default, proxied via app/api. */
    readonly NEXT_PUBLIC_API_BASE_URL?: string;
    /** Canonical origin of this app, for metadata and absolute URLs. */
    readonly NEXT_PUBLIC_SITE_URL?: string;
    /** Absolute backend origin used during SSR. Never exposed to the browser. */
    readonly API_BASE_URL?: string;
  }
}
