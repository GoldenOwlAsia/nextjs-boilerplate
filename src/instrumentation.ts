import { validateEnv } from '@/shared/config/env.validate';

/**
 * Runs once when the server process starts, before the first request.
 * Also the place to initialise tracing/error reporting (OpenTelemetry, Sentry).
 */
export function register() {
  validateEnv();
}
