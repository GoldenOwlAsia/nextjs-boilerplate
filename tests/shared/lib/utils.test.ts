import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { describe, expect, it } from 'vitest';

import { cn } from '@/shared/lib/utils';

// Mirrors src/shared/lib/utils.ts

/**
 * `cn` is backed by cnfast, which claims byte-identical output to
 * `twMerge(clsx(...))`. Every class in the app flows through it, so a divergence
 * would show up as subtle visual breakage rather than a failing build — worth
 * pinning against the reference implementation.
 *
 * `clsx` and `tailwind-merge` are devDependencies for exactly this test; nothing
 * in `src/` imports them.
 */
const reference = (...inputs: Parameters<typeof cn>) => twMerge(clsx(inputs));

/** Patterns this codebase actually produces, including shadcn's gnarlier ones. */
const cases: Parameters<typeof cn>[] = [
  ['px-2', 'px-4'],
  ['flex items-center justify-center gap-2', 'h-10 w-full', 'px-5 py-2'],
  ['rounded-md bg-primary text-primary-foreground', 'hover:bg-primary/90'],
  ['bg-primary/90', 'bg-primary/50'],
  ['size-9', 'h-10 w-10'],
  ["[&_svg:not([class*='size-'])]:size-4", "[&_svg:not([class*='size-'])]:size-3"],
  ['has-[>svg]:px-3', 'has-[>svg]:px-2.5'],
  ['dark:bg-input/30', 'dark:bg-input/50'],
  ['focus-visible:ring-[3px]', 'focus-visible:ring-2'],
  ['text-sm font-medium', false && 'hidden', undefined, null, ''],
  [{ 'text-red-500': true, 'text-blue-500': false }, 'text-green-500'],
  [['flex', ['gap-2', 'p-4']], 'p-6'],
  ['sm:w-auto md:px-6 lg:px-8', 'md:px-10'],
  ['border', 'border-border', 'outline-ring/50'],
  ['transition-all', 'transition-colors'],
];

describe('cn', () => {
  it.each(cases)('matches twMerge(clsx(...)) for %j', (...inputs) => {
    expect(cn(...inputs)).toBe(reference(...inputs));
  });

  it('lets the last conflicting utility win, which is what makes className overridable', () => {
    expect(cn('px-2 py-1', 'px-8')).toBe('py-1 px-8');
  });

  it('drops falsy values instead of emitting "false" or "undefined"', () => {
    expect(cn('flex', false, null, undefined, 0 && 'hidden')).toBe('flex');
  });
});
