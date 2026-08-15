'use client';

import { useEffect } from 'react';

import { env } from '@/shared/config/env';

/**
 * Route-level error boundary. Catches render errors in this segment and below,
 * including rejected promises passed down from Server Components.
 *
 * Note what you get here: errors thrown on the server reach the browser with
 * their message stripped and only `digest` intact. Field-level detail from an
 * `ApiError` survives only when the failure happened on the client.
 */
export default function Error({
  error,
  reset,
}: {
  error: globalThis.Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with your error reporter (Sentry, Datadog, ...).
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>

      {env.isProduction ? null : (
        <pre className="max-w-xl overflow-x-auto rounded bg-black/[.06] p-4 text-left text-sm dark:bg-white/[.08]">
          {error.message}
        </pre>
      )}

      {error.digest ? <p className="text-sm opacity-60">Reference: {error.digest}</p> : null}

      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
      >
        Try again
      </button>
    </main>
  );
}
