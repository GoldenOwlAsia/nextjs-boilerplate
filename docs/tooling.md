# Tooling

TypeScript · ESLint · Prettier. The intent: make the machine catch what code review shouldn't have
to, and keep formatting out of diffs entirely.

## Scripts

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | Dev server (Turbopack)                                |
| `pnpm build`        | Production build                                      |
| `pnpm start`        | Serve the production build                            |
| `pnpm typecheck`    | `tsc --noEmit`                                        |
| `pnpm lint`         | ESLint                                                |
| `pnpm lint:fix`     | ESLint with `--fix`                                   |
| `pnpm format`       | Prettier write                                        |
| `pnpm format:check` | Prettier check                                        |
| `pnpm test`         | Vitest, once                                          |
| `pnpm test:watch`   | Vitest in watch mode                                  |
| `pnpm test:e2e`     | Playwright (builds and starts the app itself)         |
| `pnpm check`        | typecheck + lint + format + unit tests — what CI runs |

## Node version

Pinned in `.nvmrc` (22.19.0) and `engines` (`>=20.9.0`); CI reads `.nvmrc`. Use `nvm use` after
cloning.

Node 20 reached end of life in April 2026, and it is not merely a policy matter here: jsdom 30
depends on an undici build that needs `webidl.util.markAsUncloneable`, which Node 20 does not have —
the unit suite fails to start. Run this project on 22.

> `pnpm typecheck` runs `next typegen` first, on purpose. `tsconfig.json` includes
> `.next/types/**/*.ts`, and Next generates the `PageProps` / `LayoutProps` / `RouteContext` globals
> there — but `.next/` is gitignored, so on a fresh clone or in CI they simply do not exist and
> `tsc` fails with `Cannot find name 'LayoutProps'`. Generating them is a real prerequisite of type
> checking, so it belongs in the script rather than in a paragraph someone has to read first.

## TypeScript

`strict: true` is the floor, not the ceiling. The extra flags below each close a class of bug that
`strict` alone lets through.

| Flag                                 | What it catches                                        |
| ------------------------------------ | ------------------------------------------------------ |
| `noUncheckedIndexedAccess`           | `arr[0]` is `T \| undefined` — the empty-array crash   |
| `exactOptionalPropertyTypes`         | `{ a: undefined }` silently overwriting a default      |
| `noPropertyAccessFromIndexSignature` | Typos on index-signature keys (`process.env.API_URLL`) |
| `noImplicitOverride`                 | A base-class rename silently orphaning an override     |
| `noImplicitReturns`                  | A branch that forgets to return                        |
| `noFallthroughCasesInSwitch`         | Accidental `case` fallthrough                          |
| `verbatimModuleSyntax`               | Type-only imports pulling real modules into the bundle |
| `forceConsistentCasingInFileNames`   | Works on macOS, breaks on Linux CI                     |

`noUnusedLocals` / `noUnusedParameters` are deliberately **off**: they duplicate
`@typescript-eslint/no-unused-vars`, which does the same job with an auto-fix and a `^_` escape
hatch. Two tools reporting the same defect only means one of them blocks you mid-refactor.

The two you will actually notice:

```ts
// noUncheckedIndexedAccess — narrow, don't assert
const first = items[0];
if (!first) return null;

// exactOptionalPropertyTypes — an optional property is not the same as "may be undefined".
// If callers pass a possibly-undefined value, say so in the type:
type Params = { code?: string | undefined };
```

That second one is why `ApiError`'s constructor in `shared/lib/api.ts` spells out `| undefined`.
When a third-party prop type fights the flag, widen your own type — don't turn the flag off.

Env vars are declared in `src/shared/types/env.d.ts`. Declaring them explicitly is what lets
`process.env.NEXT_PUBLIC_*` typecheck under `noPropertyAccessFromIndexSignature`, and Next.js can
only inline the dot form — bracket access would ship an undefined value to the browser. Read them
through `shared/config/env.ts`, never directly.

## ESLint

`eslint.config.mjs`, flat config, four layers in order:

1. `eslint-config-next/core-web-vitals` + `/typescript` — Next, React, hooks, a11y, import.
2. `project/typescript` — `consistent-type-imports`, `no-explicit-any`, `no-unused-vars` with a `^_`
   escape hatch.
3. `project/architecture-boundaries` — the layer rules from
   [architecture.md](./architecture.md#1-the-one-rule).
4. `eslint-config-prettier` — **last**, so no stylistic rule can fight the formatter.

The boundary rule is `import/no-restricted-paths`, which matches on _resolved file paths_. That
matters: a path-string rule like `no-restricted-imports` only sees the literal specifier, so
`../../modules/x` slips past it while `@/modules/x` is blocked. Zones are generated by reading
`src/modules` and `src/features` from disk at config load, so a new domain is isolated as soon as the
folder exists — no config edit. (Your editor's ESLint server caches that list until it restarts; CI
always sees the current one.)

`import/no-unresolved` sits in the same config block on purpose. `no-restricted-paths` **silently
ignores** any import it cannot resolve, so a broken `paths` entry or resolver upgrade would switch
off every architectural boundary with lint still green. The companion rule turns that silent failure
into a loud one. Treat them as a pair.

```text
src/shared/lib/format.ts
  3:1  error  Unexpected path "@/modules/booking/types" imported in restricted zone.
              shared/ must stay business-agnostic: it cannot import app/, features/ or modules/
```

## Prettier

`.prettierrc.json`: single quotes, semicolons, trailing commas, 100 columns, LF, plus two plugins.

**`@ianvs/prettier-plugin-sort-imports`** — import order is enforced, not negotiated. The groups
mirror the dependency direction, so the import block reads as a map of which layers a file depends
on:

```text
node: builtins
react / react-dom / next
other third-party packages

@/shared/…      ─┐
@/modules/…      ├─ aliases, in dependency order
@/features/…     │
@/app/…         ─┘

./relative
```

Side-effect imports (`'server-only'`, `./globals.css`) keep their position — order is load-bearing
for those.

**`prettier-plugin-tailwindcss`** — canonical class order, so class-list diffs stay reviewable.
Two options carry weight:

- `tailwindStylesheet: "./src/app/globals.css"` — without it the plugin cannot see the Tailwind v4
  `@theme` block and silently fails to sort custom utilities.
- `tailwindFunctions: ["cn", "cva"]` — makes it sort inside `cn(...)` and `cva(...)` calls, which is
  where essentially every class in this codebase lives. It sorts _within_ each argument and leaves
  the argument grouping alone, which is exactly what the convention in
  [styling.md](./styling.md#2-group-the-arguments) needs.

It must stay **last** in the plugin array.

Formatting is not a code-review topic here. Turn on format-on-save and ESLint auto-fix-on-save;
`pnpm check` is the backstop.

## Styling: no inline styles

**Hard rule, enforced by ESLint** (`react/forbid-dom-props` and `react/forbid-component-props` on
`style`):

```text
src/shared/components/ui/badge.tsx
  2:15  error  Use Tailwind classes or globals.css, not inline styles  react/forbid-dom-props
```

An inline `style` bypasses the design tokens in `@theme`, cannot be overridden by any stylesheet
(inline wins on specificity), is invisible to the Tailwind class sorter, and turns "change the
spacing scale" into a grep. The full convention — `cn()`, class grouping, tokens, shadcn — is in
[styling.md](./styling.md).

Two consequences worth knowing:

- `global-error.tsx` cannot inherit the root layout's stylesheet, so it imports `./globals.css`
  itself. That is the sanctioned way to style a component outside the layout tree — not inline
  styles.
- Truly dynamic values (a progress bar width from data) have no static class. The normal escape is a
  CSS custom property set via `style`, which this rule also blocks. Handle those with a bounded set
  of classes where you can; where you genuinely cannot, disable the rule on that single line with a
  comment explaining why, and keep it to leaf presentational components.

## Security headers

`next.config.ts` sets `poweredByHeader: false` and applies `nosniff`, `Referrer-Policy`,
`X-Frame-Options: DENY`, a restrictive `Permissions-Policy`, and HSTS to every route. An e2e test
asserts they are present, so removing one fails CI rather than a pentest.

**No Content-Security-Policy is set, deliberately.** A CSP strict enough to be worth having needs a
per-request nonce threaded through `proxy.ts` into the script tags; a loose one (`unsafe-inline`)
provides false assurance, and a wrong one breaks production only. Add it when you add it properly —
Next's "Content Security Policy" guide has the nonce recipe.

## Testing

| Layer | Tool                     | Lives in                   | Runs in          |
| ----- | ------------------------ | -------------------------- | ---------------- |
| Unit  | Vitest + Testing Library | `tests/**/*.test.{ts,tsx}` | jsdom            |
| E2E   | Playwright (chromium)    | `e2e/*.spec.ts`            | production build |

Tests never live in `src/`. `tests/` mirrors the source tree — `tests/shared/lib/api.test.ts` covers
`src/shared/lib/api.ts` — so a spec's path states what it covers, and production folders contain only
code that ships. `tests/setup.ts` holds the jest-dom matchers and the `cleanup()` hook.

Vitest runs with `globals: false`, so import `describe`/`it`/`expect` explicitly — that keeps test
globals out of the app's type space.

Testing something that is not exported is a signal, not an obstacle: `shouldRetryQuery` and
`resolveProxyTarget` were both lifted out of their enclosing config/handler so the _policy_ could be
tested without booting the thing around it.

Playwright's `webServer` runs `pnpm build && pnpm start` rather than `next dev`, because Fast Refresh
and the dev overlay make dev-server e2e results unrepresentative. `forbidOnly` is on in CI so a
stray `test.only` fails the run instead of quietly skipping the suite.

What the existing tests are for, beyond proving the harness works: `api.test.ts` drives the real
client through its own interceptors by swapping the axios _adapter_, so it keeps passing if the error
handling is refactored; `query-client.test.ts` pins the retry policy (never retry 4xx); the e2e 404
spec is the only thing that actually proves `not-found.tsx` is wired.

## CI

`.github/workflows/ci.yml`, two jobs on every push to `main` and every PR:

- **check** — install (frozen lockfile) → `pnpm check` → `pnpm build`
- **e2e** — install → `playwright install --with-deps chromium` → `pnpm test:e2e`, uploading the HTML
  report as an artifact

Concurrency is grouped per ref with `cancel-in-progress`, so a new push supersedes the running job.
Node comes from `.nvmrc` — one source of truth for local and CI.

## Environment variables

Declared in `src/shared/types/env.d.ts`, read only through `shared/config/env.ts`, and validated by
`shared/config/env.validate.ts`, which `src/instrumentation.ts` calls once at server boot:

```text
Failed to prepare server Error: An error occurred while loading instrumentation hook:
Invalid environment variables:
  - API_BASE_URL: must be an absolute http(s) URL — SSR has no origin to resolve against
```

Validation deliberately does **not** live in `env.ts`: that module is imported by client code, and
shipping zod to the browser to check two strings is a poor trade. The server always runs first, so
boot-time validation catches a bad value before any user does.
