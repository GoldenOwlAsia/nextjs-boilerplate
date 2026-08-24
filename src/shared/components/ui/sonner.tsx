'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { cn } from '@/shared/lib/utils';

/**
 * Diverges from the stock shadcn file in two ways, both deliberate:
 *
 * 1. No `next-themes`. Dark mode here follows the OS (`prefers-color-scheme`
 *    in globals.css), and sonner's own `theme="system"` does exactly that with
 *    its internal `matchMedia` listener. Nothing to sync.
 * 2. The token wiring is a className, not a `style` object — inline styles are
 *    forbidden project-wide. Sonner reads these custom properties off
 *    `[data-sonner-toaster]`; individual toasts inherit them. The `!` is load
 *    bearing — sonner's own defaults land on
 *    `[data-sonner-toaster][data-sonner-theme=light]`, which outranks a
 *    single-class utility on specificity. Stock shadcn wins that fight with an
 *    inline style; we win it with `!important`.
 */
const Toaster = ({ className, ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className={cn(
        'toaster group',
        '[--border-radius:var(--radius)]! [--normal-bg:var(--popover)]! [--normal-border:var(--border)]! [--normal-text:var(--popover-foreground)]!',
        className,
      )}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      {...props}
    />
  );
};

export { Toaster };
