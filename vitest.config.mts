import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // All unit tests live in `tests/`, mirroring the `src/` tree they cover.
    // `src/` stays production code only; `e2e/` is Playwright's.
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    restoreMocks: true,
  },
});
