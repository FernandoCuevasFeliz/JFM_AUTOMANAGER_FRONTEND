import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Paleta base de los badges. Los colores por estado de cada maquina viven en
 * `components/status-badge.tsx`, que mapea cada estado a una de estas tonalidades
 * para que el mismo estado se vea igual en toda la aplicacion.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        neutral: 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        blue: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
        green: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        amber: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        red: 'border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
        purple: 'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
        teal: 'border-transparent bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
