'use client';

import './globals.css';

/**
 * Last resort: catches errors thrown by the root layout itself, where `error.tsx`
 * cannot help. It replaces the whole document, so it must render <html>/<body>
 * and cannot rely on anything the layout provides — no fonts, no providers.
 *
 * That includes the stylesheet, which is why it is imported here directly rather
 * than inherited. Inline styles are not an option (see docs/tooling.md).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Application error</h1>

        {error.digest ? <p className="text-sm opacity-60">Reference: {error.digest}</p> : null}

        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
