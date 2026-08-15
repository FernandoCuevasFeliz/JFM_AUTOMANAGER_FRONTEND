import type * as React from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { COMPANY } from '@/features/billing/company';
import { cn } from '@/lib/utils';

/**
 * Piezas comunes de los documentos imprimibles (factura, cotizacion).
 *
 * Todas usan colores fijos en vez de tokens del tema: son papel. En modo oscuro
 * la hoja se sigue viendo blanca porque lo que se previsualiza es el impreso, no
 * la aplicacion. `print-color-adjust: exact` obliga al navegador a imprimir los
 * fondos, que por defecto descarta para ahorrar tinta.
 */

/**
 * Hoja CARTA (8.5 × 11 pulgadas) con los margenes del documento.
 *
 * El ancho y el relleno coinciden con `@page` en `index.css` —216mm y 12mm— para
 * que la previsualizacion en pantalla sea milimetro a milimetro lo que sale por
 * la impresora. Cuando no coincidian, el navegador reescalaba la maqueta al
 * papel real y el documento salia corrido.
 */
export function PrintSheet({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'invoice-sheet mx-auto w-full max-w-[216mm] bg-white p-[12mm]',
        'text-[10.5pt] leading-snug text-slate-900',
        className,
      )}
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      lang="es"
    >
      {children}
    </article>
  );
}

/** Cabecera: marca y datos del emisor a la izquierda, identificacion a la derecha. */
export function PrintHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Filas `<PrintMeta>` con los datos del documento. */
  children: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-5">
      <div className="flex min-w-0 flex-col gap-2.5">
        {/* En papel siempre la version oscura: el fondo es blanco. */}
        <BrandLogo height={46} priority />
        <div className="min-w-0">
          <p className="text-[11pt] font-bold leading-tight tracking-tight">{COMPANY.name}</p>
          <div className="mt-1 space-y-0.5 text-[8.5pt] leading-snug text-slate-600">
            {COMPANY.rnc && (
              <p>
                RNC <span className="font-mono font-medium text-slate-800">{COMPANY.rnc}</span>
              </p>
            )}
            {COMPANY.address && <p>{COMPANY.address}</p>}
            {COMPANY.city && <p>{COMPANY.city}</p>}
            {(COMPANY.phone || COMPANY.email) && (
              <p>{[COMPANY.phone, COMPANY.email].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[16pt] font-bold uppercase leading-none tracking-[0.12em] text-[#DC2626]">
          {title}
        </p>
        {subtitle && (
          <p className="mt-1 text-[8pt] font-semibold uppercase tracking-[0.06em] text-slate-500">
            {subtitle}
          </p>
        )}
        <table className="ml-auto mt-3 text-[9pt]">
          <tbody>{children}</tbody>
        </table>
      </div>
    </header>
  );
}

export function PrintMeta({
  label,
  value,
  mono = false,
  strong = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <tr>
      <th className="pr-3 text-right align-baseline font-medium text-slate-500">{label}</th>
      <td
        className={cn(
          'whitespace-nowrap text-left align-baseline tabular-nums',
          mono && 'font-mono',
          strong && 'font-bold',
        )}
      >
        {value}
      </td>
    </tr>
  );
}

/** Banda de aviso: el documento no es lo que aparenta ser. */
export function PrintStamp({
  children,
  tone = 'alert',
}: {
  children: React.ReactNode;
  tone?: 'alert' | 'muted';
}) {
  return (
    <p
      className={cn(
        'mt-5 border-2 px-4 py-2 text-center text-[10pt] font-bold uppercase tracking-[0.18em]',
        tone === 'muted' ? 'border-slate-500 text-slate-600' : 'border-[#DC2626] text-[#DC2626]',
      )}
    >
      {children}
    </p>
  );
}

export function PrintBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-slate-900 pl-3">
      <h2 className="mb-1.5 text-[7.5pt] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function PrintRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      <dt className="shrink-0 text-slate-400">{label}:</dt>
      <dd className={cn('min-w-0 break-words text-slate-700', mono && 'font-mono tabular-nums')}>
        {value}
      </dd>
    </div>
  );
}

export function PrintTh({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <th className={cn('whitespace-nowrap px-2.5 py-1.5 font-semibold', className)}>{children}</th>
  );
}

export function PrintTotal({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1 text-slate-600">{label}</td>
      <td className="whitespace-nowrap py-1 text-right font-mono tabular-nums">{value}</td>
    </tr>
  );
}

export function PrintSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[7.5pt] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {children}
    </h2>
  );
}

export function PrintSignature({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="text-center">
      <div className="h-px bg-slate-900" />
      <p className="mt-1.5 text-[8.5pt] font-semibold">{label}</p>
      <p className="text-[8pt] text-slate-500">{hint}</p>
    </div>
  );
}

export function PrintFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className="mt-8 border-t border-slate-300 pt-3 text-[7.5pt] leading-relaxed text-slate-500">
      {children}
    </footer>
  );
}

/** Lienzo gris que simula la mesa y hace legible el borde de la hoja. */
export function PrintPreview({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 shadow-card sm:p-8',
        'print:overflow-visible print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none',
      )}
    >
      <div className="mx-auto w-fit shadow-pop print:w-full print:shadow-none">{children}</div>
    </div>
  );
}
