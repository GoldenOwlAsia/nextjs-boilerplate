# Styling: Tailwind, shadcn/ui, and the `cn` convention

Three rules, in priority order:

1. **No inline styles.** Ever. Enforced by ESLint.
2. **Name a token, never a value.** `bg-primary`, not `bg-zinc-900`, never `#171717`.
3. **Compose className with `cn()`, one argument per concern.**

---

## 1. `cn()` — the only way to build a className

```ts
// src/shared/lib/utils.ts
export { cn } from 'cnfast';
```

Two jobs, and the second is the important one:

- Conditionals, arrays and objects are flattened, falsy values dropped.
- Tailwind **conflicts** resolve by keeping the last: `cn('px-2', 'px-4')` is `px-4`, not
  `"px-2 px-4"` with the winner decided by CSS source order.

That is what makes a component overridable. `<Button className="px-8" />` actually gets `px-8`
instead of fighting the variant's `px-4` — no `!important`, no specificity tricks, no
`className && styles.override`.

String concatenation (`` `base ${maybe}` ``) gives you neither. It is not a shortcut here, it is a
different and worse behaviour.

### Why cnfast rather than clsx + tailwind-merge

[cnfast](https://github.com/aidenybai/cnfast) is a zero-dependency drop-in for the usual
`twMerge(clsx(...))` pair, with the same output and a faster implementation. The trade is honest and
small: about 1 kB more gzipped, one more package to trust, in exchange for less work on every render
of every component.

"Same output" is a claim, not a guarantee, and every class in the app flows through this function —
a divergence would surface as subtle visual breakage rather than a failed build. So it is pinned:
`tests/shared/lib/utils.test.ts` runs the repo's real class patterns (including shadcn's
`[&_svg:not([class*='size-'])]:size-4` and `has-[>svg]:px-3`) through both implementations and
asserts they match. `clsx` and `tailwind-merge` stay as **devDependencies** purely to be that
reference; nothing in `src/` imports them.

cnfast also re-exports `clsx`, `twMerge` and `twJoin` if you ever need one directly.

### The tagged-template form

cnfast supports `` cn`px-2 px-4 ${isActive && 'bg-blue-500'}` ``, which caches per call site and is
its fastest path. Prettier sorts inside it correctly (verified), but it puts every class in one
string — which is incompatible with the grouping convention below.

**Use the call form.** Reach for the tagged form only in a hot path you have actually profiled — a
virtualised table row, a canvas overlay — and leave a comment saying so.

## 2. Group the arguments

One argument per concern, in this order. Read top to bottom, it describes the element the way you'd
describe it out loud: where it sits, how big, how spaced, what it says, what it looks like, how it
reacts, how it adapts.

| #   | Group            | Contains                                                                                      |
| --- | ---------------- | --------------------------------------------------------------------------------------------- |
| 1   | Layout           | `flex` `grid` `absolute` `inset-0` `items-*` `justify-*` `gap-*` `z-*`                        |
| 2   | Sizing           | `w-*` `h-*` `size-*` `min-*` `max-*` `flex-1` `shrink-0`                                      |
| 3   | Spacing          | `p-*` `m-*` `space-*`                                                                         |
| 4   | Typography       | `text-*` `font-*` `leading-*` `tracking-*` `truncate` `text-balance`                          |
| 5   | Visual           | `bg-*` `border*` `rounded-*` `shadow-*` `opacity-*` `ring-*`                                  |
| 6   | State & motion   | `transition-*` `hover:` `focus-visible:` `active:` `disabled:` `aria-*:` `data-*:` `group-*:` |
| 7   | Responsive       | `sm:` `md:` `lg:` `xl:`                                                                       |
| 8   | Conditional      | `isActive && '…'`, variant lookups                                                            |
| 9   | `className` prop | Always last — the caller wins.                                                                |

Skip any group you don't use. Don't invent extra ones.

```tsx
<button
  className={cn(
    'inline-flex items-center justify-center gap-2',
    'h-10 w-full',
    'px-5 py-2',
    'text-sm font-medium',
    'rounded-md bg-primary text-primary-foreground',
    'transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring',
    'sm:w-auto',
    isLoading && 'pointer-events-none opacity-60',
    className,
  )}
/>
```

### Why responsive and state get their own lines

Because that is where the reading cost is. A 30-class string mixing `md:` and `hover:` into the base
styles forces you to parse every token to answer "what does this look like on mobile?" Split out,
the answer is one line. It also makes diffs meaningful: changing a breakpoint touches the breakpoint
line, not a 400-character blob.

### Base first, modifier after

Within a group, keep the unprefixed class next to its variants — `bg-primary hover:bg-primary/90`,
not `bg-primary` in one group and `hover:bg-primary/90` three lines away from anything related.
State classes that modify group N still live in group 6; the exception is when a `hover:` is the
_only_ thing you are saying about a property, in which case it goes with its property.

### When a plain string is fine

A single group with a couple of classes and no override:

```tsx
<h1 className="text-2xl font-semibold tracking-tight">…</h1>
```

Reach for `cn()` as soon as there are two groups, a conditional, or a `className` prop to merge.

## 3. Prettier sorts _inside_ each argument

`prettier-plugin-tailwindcss` is configured with `tailwindFunctions: ["cn", "cva"]`, so it sorts
each string argument into canonical Tailwind order — and leaves your grouping alone:

```tsx
// you write            →  prettier normalises to
'justify-center flex'   →  'flex justify-center'
'py-2 px-5'             →  'px-5 py-2'
```

The two conventions compose instead of fighting: the plugin owns order _within_ a line, you own
_which_ line. Nothing to argue about in review.

`tailwindStylesheet` points at `src/app/globals.css` so the plugin can see the `@theme` block and
sort custom utilities correctly.

## 4. Design tokens

`globals.css` defines the shadcn "neutral" token set as CSS variables on `:root`, then exposes them
to Tailwind through `@theme inline`:

```text
--primary / --primary-foreground     buttons, links, emphasis
--secondary / --muted / --accent     surfaces, in decreasing prominence
--muted-foreground                   de-emphasised text
--destructive                        errors, dangerous actions
--border / --input / --ring          strokes and focus rings
--radius                             one radius scale (rounded-sm…rounded-xl)
```

**Never write a raw colour.** `bg-zinc-50` and `bg-black/[.06]` look harmless until dark mode, a
rebrand, or a contrast audit — at which point they are invisible to every search you run. If a token
is missing, add one; that is a five-line change in `globals.css` and every component picks it up.

Dark mode currently follows `prefers-color-scheme` (Tailwind v4's default `dark:` variant). For a
manual toggle, add `@custom-variant dark (&:is(.dark *));` and move the dark block onto `.dark` —
that is the only change needed, because components reference tokens rather than colours.

## 5. shadcn/ui

Configured in `components.json`, wired to this repo's layout:

```json
"components": "@/shared/components",
"ui":         "@/shared/components/ui",
"utils":      "@/shared/lib/utils",
"hooks":      "@/shared/hooks"
```

```bash
pnpm ui add dialog input form   # copies the source into src/shared/components/ui/
```

shadcn is **not a dependency** — it copies source into the repo. That means the components are
yours: edit them. When a variant is wrong for this product, change `buttonVariants`; don't wrap the
component in another component to patch it from outside.

Rules that follow from that:

- Anything under `shared/components/ui/` stays business-agnostic — same rule as the rest of
  `shared/` (ESLint enforces it). A `TripCard` is not a UI primitive; it belongs to `modules/trip`.
- Variants belong in `cva`, not in caller-side conditionals. If three screens each write
  `cn(buttonVariants(), 'bg-warning')`, that is a missing variant.
- Prefer `asChild` over duplicating styles onto a `<Link>` or `<a>`:

  ```tsx
  <Button asChild variant="outline">
    <Link href="/">Back to home</Link>
  </Button>
  ```

- Icons come from `lucide-react`. The button variants already size them
  (`[&_svg:not([class*='size-'])]:size-4`), so don't pass a size unless you mean to override.

## 6. Where component files live

```text
shared/components/ui/       shadcn primitives — Button, Input, Dialog
shared/components/layout/   app chrome — Header, Sidebar, PageShell
modules/<domain>/components/   domain UI — TripCard, BookingStatusBadge
features/<feature>/components/ screen composition — TripBookingScreen
```

The test is the same one as everywhere else in [architecture.md](./architecture.md): would this
component still make sense in a different product? If yes it is `shared/`, if no it belongs to the
domain that owns the concept.
