/**
 * The only way class names are composed in this codebase.
 *
 * `cn` resolves conditionals and arrays, then resolves Tailwind *conflicts* by
 * keeping the last one — `cn('px-2', 'px-4')` is `px-4`, not both. That second
 * half is what makes overridable components possible: a caller's `className` can
 * beat a component default without `!important` or specificity games.
 *
 * Backed by `cnfast`, a zero-dependency drop-in for `clsx` + `tailwind-merge`
 * with the same output. `tests/shared/lib/utils.test.ts` pins that equivalence.
 *
 * See docs/styling.md for how to group the arguments.
 */
export { cn } from 'cnfast';
