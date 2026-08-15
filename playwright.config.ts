import { defineConfig, devices } from '@playwright/test';

// Bracket access: these are tooling variables, not app config, so they are not
// declared in src/types/env.d.ts and Next.js never inlines this file.
const isCI = Boolean(process.env['CI']);
const PORT = Number(process.env['PORT'] ?? 3000);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A stray `test.only` should fail CI, not silently skip the rest of the suite.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  // `github` annotates the PR diff; `html` is what CI uploads as an artifact.
  // Using `github` alone means no report is written and the upload step warns.
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Test the production build: dev-only behaviour (Fast Refresh, dev overlay)
    // makes e2e results unrepresentative.
    command: 'pnpm build && pnpm start',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
