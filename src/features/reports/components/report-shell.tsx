import { ShieldX } from 'lucide-react';
import type * as React from 'react';
import { DetailAmount } from '@/components/detail-view';
import { EmptyState, ErrorState } from '@/components/states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MonthRangeParams } from '../types';

/**
 * Piezas compartidas de los reportes.
 *
 * Los cinco paneles repiten la misma coreografia —filtro de rango, estado de
 * carga, error, vacio y un bloque de totales— asi que vive aqui una sola vez.
 */

/** Rango de meses. El backend lleva cualquier dia al mes al que pertenece. */
export function MonthRangeFilter({
  value,
  onChange,
  children,
}: {
  value: MonthRangeParams;
  onChange: (next: MonthRangeParams) => void;
  /** Filtros propios del reporte, a la derecha del rango. */
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-2.5 shadow-card sm:flex-row sm:flex-wrap sm:items-center print:hidden"
      role="search"
    >
      <span className="label-micro shrink-0 pl-1 text-muted-foreground">Periodo</span>

      <Input
        type="date"
        aria-label="Desde"
        value={value.dateFrom ?? ''}
        onChange={(event) => onChange({ ...value, dateFrom: event.target.value || undefined })}
        className="w-full sm:w-40"
      />
      <span className="hidden text-sm text-muted-foreground sm:inline">a</span>
      <Input
        type="date"
        aria-label="Hasta"
        value={value.dateTo ?? ''}
        onChange={(event) => onChange({ ...value, dateTo: event.target.value || undefined })}
        className="w-full sm:w-40"
      />

      {children}
    </div>
  );
}

/**
 * Tarjeta de un reporte con sus estados.
 *
 * `isEmpty` se decide fuera porque cada reporte sabe que es "vacio" para el: en
 * uno son cero filas y en otro, cero importe.
 */
export function ReportCard({
  title,
  description,
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty,
  emptyLabel = 'No hay datos en el periodo seleccionado.',
  height = 300,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyLabel?: string;
  /** Alto reservado mientras carga, para que la pagina no de saltos. */
  height?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('report-block', className)}>
      <CardHeader className={cn(actions && 'flex-row items-start justify-between gap-4 space-y-0')}>
        <div className="flex flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full" style={{ height }} />
        ) : isError ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : isEmpty ? (
          <EmptyState title="Sin datos" description={emptyLabel} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/** Fila de totales del periodo, en la moneda de reporte. */
export function ReportTotals({
  items,
}: {
  items: { label: string; value: string; tone?: 'neutral' | 'positive' | 'warning' | 'danger' }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
      {items.map((item) => (
        <Card key={item.label} className="report-block">
          <CardContent className="px-5 pb-5 pt-5">
            <DetailAmount label={item.label} value={item.value} tone={item.tone} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** El rol no alcanza para este reporte: se explica, no se deja en blanco. */
export function ReportForbidden({ needs }: { needs: string }) {
  return (
    <Card>
      <CardContent className="px-5 pb-5 pt-5">
        <EmptyState
          icon={ShieldX}
          title="No tienes acceso a este reporte"
          description={`Ademas de poder ver reportes, hace falta el permiso ${needs}. Es a proposito: un reporte no puede ser una puerta lateral a datos que tu rol no ve en su propio modulo.`}
        />
      </CardContent>
    </Card>
  );
}
