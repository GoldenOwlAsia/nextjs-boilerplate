import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { SITE } from '@/shared/constants/site';
import { cn } from '@/shared/lib/utils';

/**
 * Reference for the className convention — see docs/styling.md.
 * Every class here names a design token; no raw hex, no zinc-500.
 */
export default function Home() {
  return (
    <main
      className={cn(
        'flex flex-1 flex-col items-center justify-center',
        'gap-8 px-6 py-24',
        'text-center',
      )}
    >
      <div className={cn('flex flex-col items-center', 'gap-4', 'max-w-2xl')}>
        <p
          className={cn(
            'rounded-full border px-3 py-1',
            'text-xs font-medium tracking-wide uppercase',
            'text-muted-foreground',
          )}
        >
          {SITE.name}
        </p>

        <h1
          className={cn(
            'text-3xl leading-tight font-semibold tracking-tight text-balance',
            'sm:text-4xl',
          )}
        >
          Feature-based Next.js starter
        </h1>

        <p className={cn('text-base text-pretty text-muted-foreground', 'sm:text-lg')}>
          {SITE.description} Layer boundaries are enforced by ESLint, not by convention. Start in{' '}
          <code className={cn('rounded bg-muted px-1.5 py-0.5', 'font-mono text-[0.9em]')}>
            src/app/(public)/page.tsx
          </code>
          .
        </p>
      </div>

      <div className={cn('flex flex-col items-stretch', 'gap-3', 'w-full max-w-sm', 'sm:flex-row')}>
        <Button asChild size="lg" className="flex-1">
          <Link href="/api/health">
            Check health
            <ArrowRight />
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="flex-1">
          <a href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer">
            <BookOpen />
            Documentation
          </a>
        </Button>
      </div>
    </main>
  );
}
