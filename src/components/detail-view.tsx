import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Piezas de las fichas de detalle.
 *
 * Las cinco pantallas de detalle repiten la misma forma —una rejilla de pares
 * etiqueta/valor dentro de tarjetas— asi que la estructura vive aqui y cada
 * modulo solo aporta sus campos. Un campo vacio se pinta como raya, nunca se
 * omite: en una ficha, un hueco visible dice "no hay dato" y un campo ausente
 * hace dudar de si la pantalla se quedo a medias.
 */

export function DetailCard({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('h-fit', className)}>
      <CardHeader
        className={cn(actions && 'flex-row items-center justify-between gap-4 space-y-0')}
      >
        <CardTitle>{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DetailGrid({
  children,
  columns = 2,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {children}
    </dl>
  );
}

export function DetailItem({
  label,
  value,
  children,
  /** Cifras, codigos y fechas: monoespaciado y tabular. */
  numeric = false,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
  numeric?: boolean;
  className?: string;
}) {
  const content = children ?? value;
  const empty = content === null || content === undefined || content === '';

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <dt className="label-micro text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'min-w-0 break-words text-sm',
          numeric && 'num',
          empty && 'text-muted-foreground',
        )}
      >
        {empty ? '—' : content}
      </dd>
    </div>
  );
}

/** Cifra destacada: montos y totales que se leen de un vistazo. */
export function DetailAmount({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger';
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-micro text-muted-foreground">{label}</span>
      <span
        className={cn(
          'num text-xl font-semibold leading-none',
          tone === 'positive' && 'text-success',
          tone === 'warning' && 'text-warning',
          tone === 'danger' && 'text-danger',
        )}
      >
        {value}
      </span>
    </div>
  );
}
