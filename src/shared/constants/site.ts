import { env } from '@/shared/config/env';

/**
 * Product-level identity used by metadata, OG images and transactional copy.
 * One place to change when the project stops being called "boilerplate".
 */
export const SITE = {
  name: 'nextjs-boilerplate',
  description: 'Next.js App Router starter with a feature-based architecture.',
  url: env.siteUrl,
  locale: 'en',
} as const;
