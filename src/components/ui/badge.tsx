import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Paleta base de los badges. Los colores por estado de cada maquina viven en
 * `components/status-badge.tsx`, que mapea cada estado a una de estas tonalidades
 * para que el mismo estado se vea igual en toda la aplicacion.
 *
 * Forma: rectangulo de esquina viva, no pastilla. En una tabla densa la pastilla
 * redonda desperdicia ancho y suaviza una lectura que debe ser tecnica. Cada
 * tono lleva un borde teñido del mismo color: define el chip incluso cuando el
 * relleno cae sobre una fila resaltada.
 */
const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5',
    'text-[11px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap',
    'transition-colors',
  ],
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary/10 text-primary dark:text-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-muted-foreground',
        neutral:
          'border-slate-300/70 bg-slate-100 text-slate-700 dark:border-slate-600/50 dark:bg-slate-700/40 dark:text-slate-200',
        blue: 'border-blue-300/70 bg-blue-100 text-blue-800 dark:border-blue-400/30 dark:bg-blue-400/15 dark:text-blue-200',
        green:
          'border-emerald-300/70 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-200',
        amber:
          'border-amber-300/80 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200',
        red: 'border-red-300/70 bg-red-100 text-red-800 dark:border-red-400/30 dark:bg-red-400/15 dark:text-red-200',
        purple:
          'border-violet-300/70 bg-violet-100 text-violet-800 dark:border-violet-400/30 dark:bg-violet-400/15 dark:text-violet-200',
        teal: 'border-teal-300/70 bg-teal-100 text-teal-800 dark:border-teal-400/30 dark:bg-teal-400/15 dark:text-teal-200',
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
