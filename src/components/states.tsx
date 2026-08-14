import { AlertCircle, Inbox, Loader2, RefreshCw, SearchX } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/lib/errors';
import { cn } from '@/lib/utils';

/**
 * Estados transversales de las pantallas: vacio, error, cargando.
 *
 * Se centralizan para que ninguna tabla resuelva solo el caso feliz.
 */

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className,
      )}
    >
      {/* La retícula tenue evita que el vacio se lea como un fallo de carga. */}
      <div className="relative flex size-14 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground">
        <span className="grid-blueprint absolute inset-0 rounded-xl opacity-60" aria-hidden />
        <Icon className="relative size-6" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        {description && (
          <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Vacio por filtros: distinto de "no hay nada todavia". */
export function NoResultsState({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={SearchX}
      title="Sin resultados"
      description="Ningun registro coincide con los filtros aplicados."
      action={
        onClear && (
          <Button variant="outline" size="sm" onClick={onClear}>
            Limpiar filtros
          </Button>
        )
      }
    />
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const message = isApiError(error)
    ? error.message
    : 'No se pudieron cargar los datos. Intentalo de nuevo.';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-xl border border-danger/20 bg-danger/8 text-danger">
        <AlertCircle className="size-6" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[15px] font-semibold">No se pudo cargar</p>
        <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw />
          Reintentar
        </Button>
      )}
    </div>
  );
}

/** Filas fantasma con la misma altura que las reales, para no dar saltos. */
export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div>
      {/* Cabecera fantasma: sin ella la tabla "crece" al llegar los datos. */}
      <div className="flex h-9 items-center gap-4 border-b border-border bg-muted/60 px-4">
        {Array.from({ length: columns }).map((_, columnIndex) => (
          <Skeleton
            key={columnIndex}
            className={cn('h-2.5', columnIndex === 0 ? 'w-24' : 'w-16', columnIndex === columns - 1 && 'ml-auto w-10')}
          />
        ))}
      </div>

      <div className="divide-y divide-border/70">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex h-11 items-center gap-4 px-4">
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className={cn(
                  'h-3.5',
                  columnIndex === 0 ? 'w-40' : 'w-24',
                  columnIndex === columns - 1 && 'ml-auto w-16',
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-5 shadow-card">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="mt-4 h-7 w-32" />
          <Skeleton className="mt-3 h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function FullPageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      <p className="label-micro text-muted-foreground">{label}</p>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
