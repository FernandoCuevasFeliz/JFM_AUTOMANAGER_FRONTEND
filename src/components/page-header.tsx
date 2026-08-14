import { ChevronLeft } from 'lucide-react';
import type * as React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Enlace de vuelta al listado, en las pantallas de detalle y formulario. */
  backTo?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  /** Rotulo tecnico sobre el titulo: modulo, folio, matricula. */
  eyebrow?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  backTo,
  backLabel = 'Volver',
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3', className)}>
      {backTo && (
        <Link
          to={backTo}
          className="hit-target -ml-1 inline-flex w-fit items-center gap-1 rounded-md py-0.5 pl-1 pr-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          {eyebrow && <span className="label-micro text-muted-foreground">{eyebrow}</span>}
          <h1 className="truncate text-[27px] font-bold leading-tight tracking-[-0.03em]">{title}</h1>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
