import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

import { type SortOrder } from '@/shared/types/pagination';

const SORT_ORDERS = ['asc', 'desc'] as const satisfies readonly SortOrder[];

/**
 * Generic list-screen URL state. Domain-specific filters extend this inside the
 * feature that owns the screen:
 *
 * ```ts
 * export const tripSearchParams = {
 *   ...listSearchParams,
 *   destination: parseAsString.withDefault(''),
 * };
 * export const loadTripSearchParams = createLoader(tripSearchParams);
 * ```
 *
 * Keeping the parser map exported (not just the loader) is what lets the server
 * loader and the client `useQueryStates` hook stay in sync — one definition,
 * both sides.
 */
export const listSearchParams = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
  q: parseAsString.withDefault(''),
  sort: parseAsString.withDefault(''),
  order: parseAsStringLiteral(SORT_ORDERS).withDefault('desc'),
};

/** Parses `searchParams` in a Server Component into typed values. */
export const loadListSearchParams = createLoader(listSearchParams);
