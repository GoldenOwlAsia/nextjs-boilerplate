import { defaultShouldDehydrateQuery, isServer, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/lib/api';

const MAX_RETRIES = 2;

/**
 * Exported so the policy can be unit-tested: retrying a 4xx just produces the
 * same error more slowly, while network and 5xx failures are often transient.
 */
export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.isClientError) return false;

  return failureCount < MAX_RETRIES;
};

const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Non-zero on the server too: without it, every query prefetched on the
        // server is refetched immediately after hydration on the client.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
      mutations: {
        retry: false,
      },
      dehydrate: {
        // Ship in-flight queries to the client as well, so a streamed page can
        // resume a request the server started instead of restarting it.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

/**
 * Server: a fresh client per call, so no request ever observes another
 * request's cache.
 * Browser: one singleton, created lazily — recreating it on a Suspense-driven
 * re-render would throw away the cache.
 */
export const getQueryClient = (): QueryClient => {
  if (isServer) return makeQueryClient();

  browserQueryClient ??= makeQueryClient();

  return browserQueryClient;
};
