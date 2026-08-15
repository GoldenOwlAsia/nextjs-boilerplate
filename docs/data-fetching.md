# Data fetching: axios · TanStack Query · nuqs

Three tools, three jobs. Keeping them separate is what makes the data layer boring, which is the goal.

| Tool               | Owns                                      | Never does                      |
| ------------------ | ----------------------------------------- | ------------------------------- |
| **axios**          | HTTP transport, auth headers, error shape | Caching, React, retries         |
| **TanStack Query** | Server-state cache, retries, invalidation | Knowing about URLs or transport |
| **nuqs**           | State that belongs in the URL             | Storing server data             |

The rule of thumb: **if a refresh should preserve it, it goes in the URL; if the server owns it, it
goes in the query cache; nothing else is "state".**

---

## 1. The three files of a module

Every domain splits its data layer the same way. The split is not ceremony — each file has a
different reason to change and a different testing story.

```text
modules/trip/
├── services/
│   ├── trip.api.ts     # what the endpoint is        (changes when the backend changes)
│   └── trip.query.ts   # how it's cached             (changes when UX/caching changes)
└── hydrate/
    └── trip.hydrate.ts # what the server prefetches  (changes when a route changes)
```

### `trip.api.ts` — transport only

No React, no query keys. Plain async functions that can be called from a test, a script, or a route
handler.

```ts
import { api } from '@/shared/lib/api';
import { type ApiResponse } from '@/types/api';
import { type Trip, type TripFilters } from '@/modules/trip/types';

export const getTripById = async (id: string): Promise<Trip> => {
  const { data } = await api.get<ApiResponse<Trip>>(`/trips/${id}`);

  return data.data;
};

export const searchTrips = async (filters: TripFilters, signal?: AbortSignal): Promise<Trip[]> => {
  const { data } = await api.get<ApiResponse<Trip[]>>('/trips', { params: filters, signal });

  return data.data;
};
```

Unwrap the `ApiResponse` envelope here. Nothing above this layer should know the backend wraps its
payloads — that is exactly the kind of detail that leaks into 200 components if you let it.

Pass `signal` through on anything user-typed (search, autocomplete): TanStack Query supplies it and
axios will cancel the in-flight request when the key changes.

### `trip.query.ts` — cache configuration

```ts
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

export const qkTrip = {
  root: ['qk_trip'] as const,
  list: (filters: TripFilters) => [...qkTrip.root, 'list', filters] as const,
  detail: (id: string) => [...qkTrip.root, 'detail', { id }] as const,
};

export const tripDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: qkTrip.detail(id),
    queryFn: () => getTripById(id),
  });

export const tripListQueryOptions = (filters: TripFilters) =>
  queryOptions({
    queryKey: qkTrip.list(filters),
    queryFn: ({ signal }) => searchTrips(filters, signal),
    placeholderData: (previous) => previous, // keep the old page visible while paging
  });
```

Why `queryOptions()` and not a `useTripDetail()` hook as the primary export: the same object is used
by the client hook, by the server prefetch, and by `queryClient.ensureQueryData` in an event handler.
One definition, no drift between what the server prefetches and what the client subscribes to.

**Query key design.** Keys are a hierarchy, and the hierarchy is your invalidation API:

```ts
queryClient.invalidateQueries({ queryKey: qkTrip.root }); // everything trip-related
queryClient.invalidateQueries({ queryKey: qkTrip.detail(id) }); // one trip
```

Rules that save pain later: the domain prefix comes first (`qk_trip`), every variable that changes
the response is in the key, and objects are serialized structurally by TanStack Query so
`{ id }` is stable regardless of key order. Never build keys inline in a component.

### Mutations live next to their queries

```ts
export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: qkBooking.root });
      queryClient.setQueryData(qkBooking.detail(booking.id), booking);
    },
  });
};
```

Invalidate broadly, `setQueryData` narrowly. Optimistic updates are worth it for toggles and
reorderings; for anything with server-side validation, prefer invalidation and a pending state — a
rollback that races a refetch is a bug you will debug at 2am.

---

## 2. Server prefetch and hydration

The point of hydration is that the browser never renders an empty shell for data the server already
had. The pattern:

```ts
// modules/trip/hydrate/trip.hydrate.ts
import { dehydrate } from '@tanstack/react-query';

import { getQueryClient } from '@/shared/lib/query-client';
import { tripDetailQueryOptions } from '@/modules/trip/services/trip.query';

export const hydrateTripDetail = async (id: string) => {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(tripDetailQueryOptions(id));

  return dehydrate(queryClient);
};
```

```tsx
// app/(dashboard)/trips/[id]/page.tsx
export default async function TripDetailPage({ params }: PageProps<'/trips/[id]'>) {
  const { id } = await params;

  return (
    <HydrationBoundary state={await hydrateTripDetail(id)}>
      <TripBookingScreen tripId={id} />
    </HydrationBoundary>
  );
}
```

```tsx
// features/trip-booking/components/TripBookingScreen.tsx
'use client';

export function TripBookingScreen({ tripId }: { tripId: string }) {
  const { data: trip } = useSuspenseQuery(tripDetailQueryOptions(tripId));
  // ...
}
```

Things that go wrong here:

- **`staleTime: 0`** — the client refetches everything immediately after hydration and you've paid
  for the data twice. Our default is 60s (`shared/lib/query-client.ts`); override per query, not
  globally.
- **Sequential awaits** — `await prefetch(a); await prefetch(b)` is a server-side waterfall. Use
  `await Promise.all([...])`, or don't await at all and let the query stream (our `dehydrate`
  defaults ship pending queries, so the client picks up where the server left off).
- **A `QueryClient` shared across requests** — user A's cache served to user B. `getQueryClient()`
  returns a fresh client on the server for exactly this reason; never hoist one to a module constant.
- **Prefetching everything** — prefetch what is above the fold and needed for first paint. The rest
  can load on the client; a slower TTFB is worse than a spinner in a sidebar.

Use `useSuspenseQuery` when the data was prefetched (it renders with data on the first pass) and
`useQuery` when it genuinely may be absent or is client-only.

---

## 3. Errors

Everything thrown out of `shared/lib/api.ts` is an `ApiError` with `status`, `code`, `details`, and
an `isClientError` getter. That contract is why the retry policy can be written once:

```ts
retry: (failureCount, error) => {
  if (error instanceof ApiError && error.isClientError) return false;

  return failureCount < MAX_RETRIES;
};
```

Retrying a 422 five times is just a slower error message. Retry network and 5xx failures; surface 4xx
immediately. Consume `details` for field-level form errors; let `error.tsx` handle the rest.

---

## 4. URL state with nuqs

Filters, pagination, sort, active tab, open dialog id — these belong in the URL. It costs nothing and
you get shareable links, working back/forward, and state that survives a refresh. `useState` for a
filter is a bug you haven't hit yet.

Define parsers once and use them on both sides:

```ts
// features/trip-search/search-params.ts
import { createLoader, parseAsString } from 'nuqs/server';

import { listSearchParams } from '@/shared/lib/search-params';

export const tripSearchParams = {
  ...listSearchParams, // page, limit, q, sort, order
  destination: parseAsString.withDefault(''),
};

export const loadTripSearchParams = createLoader(tripSearchParams);
```

Server — parse and prefetch with the same values the client will ask for:

```tsx
export default async function TripsPage({ searchParams }: PageProps<'/trips'>) {
  const filters = await loadTripSearchParams(searchParams);

  return (
    <HydrationBoundary state={await hydrateTripList(filters)}>
      <TripSearchScreen />
    </HydrationBoundary>
  );
}
```

Client — read and write the same keys:

```tsx
'use client';

export function TripFilters() {
  const [filters, setFilters] = useQueryStates(tripSearchParams, { shallow: false });
  const { data } = useSuspenseQuery(tripListQueryOptions(filters));

  return (
    <SearchInput
      value={filters.q}
      onChange={(q) => setFilters({ q, page: 1 })} // reset the page on every filter change
    />
  );
}
```

Notes worth internalizing:

- **The parsed search params are the query key.** That is the whole design: URL → filters → key →
  cache. Never keep a second copy in `useState`.
- **`shallow: false`** re-runs the server component (needed when the server prefetches from the URL).
  Leave it default (`true`) for pure client filtering — it's much faster.
- **Reset `page` whenever a filter changes**, or the user lands on page 7 of a 2-page result.
- Debounce text inputs with `throttleMs`/`limitUrlUpdates` rather than debouncing the query — the URL
  is what everything else derives from.
- `NuqsAdapter` is already mounted in `app/providers.tsx`.

---

## 5. Defaults you are inheriting

`shared/lib/query-client.ts`:

| Setting                | Value         | Why                                                      |
| ---------------------- | ------------- | -------------------------------------------------------- |
| `staleTime`            | 60s           | Stops the post-hydration double fetch                    |
| `gcTime`               | 5min          | Back-navigation renders from cache                       |
| `refetchOnWindowFocus` | `false`       | Alt-tabbing is not a user intent to refetch              |
| `retry`                | 2, not on 4xx | Client errors don't get better with repetition           |
| `mutations.retry`      | `false`       | Retrying a non-idempotent write is how you double-charge |
| `shouldDehydrateQuery` | + pending     | Streamed pages resume server-started requests            |

Override per query where the domain calls for it (a live dashboard wants `staleTime: 0` and
`refetchInterval`); don't loosen the global defaults to fix one screen.

Devtools are mounted in development via `app/providers.tsx` and compile out of production builds.
