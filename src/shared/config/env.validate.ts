import { z } from 'zod';

/**
 * Boot-time environment validation.
 *
 * Runs once from `src/instrumentation.ts` when the server starts, so a missing
 * or malformed variable fails the process with a readable message instead of
 * surfacing as a confusing 500 on some request three hours later.
 *
 * Kept out of `env.ts` on purpose: that module is imported by client code, and
 * zod has no business in the browser bundle just to check a base URL.
 */
const isAbsoluteUrl = (value: string) => /^https?:\/\//.test(value);

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .min(1, 'must not be empty')
    .refine(
      (value) => value.startsWith('/') || isAbsoluteUrl(value),
      'must be an absolute http(s) URL or a root-relative path like /api',
    )
    .optional(),

  NEXT_PUBLIC_SITE_URL: z
    .string()
    .refine(isAbsoluteUrl, 'must be an absolute http(s) URL')
    .optional(),

  API_BASE_URL: z
    .string()
    .refine(isAbsoluteUrl, 'must be an absolute http(s) URL — SSR has no origin to resolve against')
    .optional(),
});

export const validateEnv = (): void => {
  // Literal member access, not a `process.env` spread: Next.js only inlines the
  // literal form, and a spread would read an empty object in the browser build.
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    API_BASE_URL: process.env.API_BASE_URL,
  });

  if (result.success) return;

  const details = result.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment variables:\n${details}\n\nSee .env.example.`);
};
