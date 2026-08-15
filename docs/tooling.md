# Tooling: TypeScript, ESLint, Prettier

## Scripts

| Command             | What it does                                               |
| ------------------- | ---------------------------------------------------------- |
| `pnpm dev`          | Dev server (Turbopack)                                     |
| `pnpm build`        | Production build                                           |
| `pnpm start`        | Serve the production build                                 |
| `pnpm typecheck`    | `tsc --noEmit`                                             |
| `pnpm lint`         | ESLint                                                     |
| `pnpm lint:fix`     | ESLint with `--fix`                                        |
| `pnpm format`       | Prettier write                                             |
| `pnpm format:check` | Prettier check (CI)                                        |
| `pnpm check`        | `typecheck` + `lint` + `format:check` — run before pushing |

> `pnpm typecheck` reads generated route types from `.next/types`. After moving or adding routes,
> run `pnpm exec next typegen` (or `pnpm build`) if the type checker complains about a stale
> `validator.ts`.

## TypeScript

`strict: true` plus the flags below (`tsconfig.json`):

| Flag                                    | Effect                                                       |
| --------------------------------------- | ------------------------------------------------------------ |
| `noUncheckedIndexedAccess`              | `arr[i]` / `obj[key]` are `T \| undefined` — handle the miss |
| `exactOptionalPropertyTypes`            | `{ a?: string }` rejects an explicit `a: undefined`          |
| `noPropertyAccessFromIndexSignature`    | Index-signature keys must use `obj['key']`                   |
| `noImplicitOverride`                    | `override` keyword required                                  |
| `noImplicitReturns`                     | All code paths must return                                   |
| `noFallthroughCasesInSwitch`            | No accidental `case` fallthrough                             |
| `noUnusedLocals` / `noUnusedParameters` | Dead bindings are errors (prefix with `_` to keep one)       |
| `verbatimModuleSyntax`                  | Type-only imports must be written `import type`              |
| `forceConsistentCasingInFileNames`      | Case-correct imports (macOS ↔ Linux CI)                      |

Working with these:

```ts
// noUncheckedIndexedAccess
const first = items[0];
if (!first) return null;

// verbatimModuleSyntax + consistent-type-imports (ESLint autofixes this)
import { type Trip, getTripById } from '@/modules/trip/services/trip.api';

// exactOptionalPropertyTypes — omit the key instead of passing undefined
const props = value === undefined ? {} : { value };
```

If `exactOptionalPropertyTypes` fights a third-party prop type, widen your own type to
`prop?: T | undefined` rather than turning the flag off.

## ESLint

`eslint.config.mjs` (flat config) layers:

1. `eslint-config-next/core-web-vitals` + `/typescript` — Next.js, React, hooks, a11y, import.
2. **`project/typescript`** — `consistent-type-imports`, `no-explicit-any`, `no-unused-vars` with
   `^_` escape hatch.
3. **`project/architecture-boundaries`** — `import/no-restricted-paths` enforcing
   `app → features → modules → shared`. See [architecture.md](./architecture.md#8-import-dependency-rules).
4. `eslint-config-prettier` — last, so formatting rules never fight Prettier.

The boundary zones for module/feature isolation are read from the folders in `src/modules` and
`src/features` at config load time, so adding `modules/payment` automatically forbids the rest of
`src/modules` from being imported inside it — no config edit needed.

Example failure:

```text
src/shared/lib/http.ts
  1:19  error  Unexpected path "@/modules/auth/services/auth.api" imported in restricted zone.
               shared/ must stay business-agnostic: it cannot import app/, features/ or modules/
```

## Prettier

`.prettierrc.json`: single quotes, semicolons, trailing commas, 100-column width, LF endings, plus
`prettier-plugin-tailwindcss` to keep Tailwind class order canonical.

ESLint does not format — Prettier owns formatting; `eslint-config-prettier` disables every stylistic
rule that would overlap.

Editor setup: enable "format on save" with the Prettier extension, and ESLint auto-fix on save for
import-type fixes.
