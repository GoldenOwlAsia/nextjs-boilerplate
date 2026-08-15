'use client';

import { useEffect } from 'react';

import { Button } from '@/shared/components/ui/button';
import { env } from '@/shared/config/env';
import { cn } from '@/shared/lib/utils';

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
    <main
      className={cn('flex flex-1 flex-col items-center justify-center', 'gap-4 p-8', 'text-center')}
    >
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>

      {env.isProduction ? null : (
        <pre
          className={cn(
            'max-w-xl overflow-x-auto',
            'rounded-lg bg-muted p-4',
            'text-left font-mono text-sm',
          )}
        >
          {error.message}
        </pre>
      )}

      {error.digest ? (
        <p className="text-sm text-muted-foreground">Reference: {error.digest}</p>
      ) : null}

      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
