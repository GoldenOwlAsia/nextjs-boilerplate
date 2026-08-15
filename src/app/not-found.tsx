import Link from 'next/link';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

/**
 * Rendered for unmatched URLs and for any `notFound()` call that isn't caught by
 * a closer `not-found.tsx`. Keep it a Server Component — it needs no JS.
 */
export default function NotFound() {
  return (
    <main
      className={cn('flex flex-1 flex-col items-center justify-center', 'gap-4 p-8', 'text-center')}
    >
      <p className="text-sm font-medium text-muted-foreground">404</p>

      <h1 className="text-2xl font-semibold tracking-tight">This page could not be found</h1>

      <Button asChild variant="outline">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
