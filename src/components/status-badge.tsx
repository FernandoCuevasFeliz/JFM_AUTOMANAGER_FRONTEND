import { Badge } from '@/components/ui/badge';
import type { StatusMeta } from '@/lib/status';
import { cn } from '@/lib/utils';

/**
 * Badge generico de estado. Cada modulo exporta su propia envoltura tipada
 * (`VehicleStatusBadge`, `SaleStatusBadge`…) sobre este componente, de forma que
 * el color de un estado se define una sola vez en `lib/status.ts`.
 */
export function StatusBadge<T extends string>({
  meta,
  className,
}: {
  meta: StatusMeta<T> | undefined;
  className?: string;
}) {
  if (!meta) return <Badge variant="neutral">—</Badge>;

  return (
    <Badge variant={meta.tone} className={cn(className)}>
      {meta.label}
    </Badge>
  );
}

/** Punto de color + texto, para leyendas y listas densas. */
export function StatusDot({ meta }: { meta: StatusMeta<string> | undefined }) {
  if (!meta) return <span className="text-muted-foreground">—</span>;

  const toneClass: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-violet-500',
    teal: 'bg-teal-500',
    neutral: 'bg-slate-400',
    default: 'bg-primary',
    secondary: 'bg-slate-400',
    outline: 'bg-slate-400',
  };

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={cn('size-2 rounded-full', toneClass[meta.tone] ?? 'bg-slate-400')} />
      {meta.label}
    </span>
  );
}
