'use client';

import { type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { Toaster } from '@/shared/components/ui/sonner';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { getQueryClient } from '@/shared/lib/query-client';

/**
 * The only client boundary in the root layout. Keep it to context providers —
 * anything rendered here opts its whole subtree out of Server Components.
 */
export function Providers({ children }: { children: ReactNode }) {
  // Not `useState(makeQueryClient)`: getQueryClient already returns the browser
  // singleton, and a fresh client per server render.
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <TooltipProvider>{children}</TooltipProvider>
      </NuqsAdapter>
      {/* Leaves, not providers: they render alongside the tree, not around it. */}
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
