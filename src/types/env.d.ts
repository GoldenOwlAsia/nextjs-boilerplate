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
    readonly NEXT_PUBLIC_API_BASE_URL?: string;
  }
}
