import type { NextConfig } from 'next';

/**
 * Baseline security headers. These are the ones that are safe to apply blindly;
 * a Content-Security-Policy is deliberately absent because a useful one needs a
 * per-request nonce (see docs/tooling.md) and a wrong one breaks the app in
 * production only.
 */
const securityHeaders = [
  // Stop browsers guessing a response's type — the classic way an uploaded
  // "image" gets executed as a script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't leak full URLs (which may contain ids or tokens) to other origins.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Clickjacking. Drop to SAMEORIGIN if you ever embed your own app in a frame.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Two years, subdomains included. Only takes effect over HTTPS.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  // Free information about the stack for anyone scanning.
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
