import type * as React from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { COMPANY } from '@/features/billing/company';

/**
 * Membrete de las pantallas que se imprimen sin ser un documento.
 *
 * Un reporte impreso no puede empezar con el titulo de la pantalla y el boton
 * de imprimir: sale de la oficina, lo lee alguien que no estaba delante del
 * panel y tiene que decir por si mismo de quien es, que contiene, de que
 * periodo y cuando se saco. Eso es exactamente lo que pone aqui.
 *
 * Solo existe en papel (`hidden print:block`): en pantalla ya esta el
 * `PageHeader`, que dice lo mismo con el lenguaje de la aplicacion.
 *
 * Colores fijos, no tokens: es papel. Da igual el tema con el que se dispare la
 * impresion.
 */
export function PrintLetterhead({
  title,
  subtitle,
  meta = [],
}: {
  title: string;
  subtitle?: string;
  /** Filas de contexto a la derecha: periodo, fecha de emision, usuario. */
  meta?: { label: string; value: string }[];
}) {
  return (
    <header
      className="print-letterhead hidden border-b-2 border-slate-900 pb-4 text-slate-900 print:block"
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
    >
      <div className="flex items-start justify-between gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <BrandLogo height={38} priority />
          <div className="min-w-0">
            <p className="text-[10pt] font-bold leading-tight tracking-tight">{COMPANY.name}</p>
            <div className="mt-0.5 space-y-0.5 text-[7.5pt] leading-snug text-slate-600">
              {COMPANY.rnc && (
                <p>
                  RNC <span className="font-mono font-medium text-slate-800">{COMPANY.rnc}</span>
                </p>
              )}
              {COMPANY.address && <p>{COMPANY.address}</p>}
              {(COMPANY.phone || COMPANY.email) && (
                <p>{[COMPANY.phone, COMPANY.email].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[14pt] font-bold uppercase leading-none tracking-[0.1em] text-[#DC2626]">
            {title}
          </p>
          {subtitle && (
            <p className="mt-1 text-[7.5pt] font-semibold uppercase tracking-[0.06em] text-slate-500">
              {subtitle}
            </p>
          )}

          {meta.length > 0 && (
            <table className="ml-auto mt-2.5 text-[8pt]">
              <tbody>
                {meta.map((row) => (
                  <tr key={row.label}>
                    <th className="pr-3 text-right align-baseline font-medium text-slate-500">
                      {row.label}
                    </th>
                    <td className="text-left align-baseline tabular-nums">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </header>
  );
}

/** Pie del impreso: la letra pequeña que en pantalla vive suelta bajo la tabla. */
export function PrintLetterfoot({ children }: { children: React.ReactNode }) {
  return (
    <footer className="hidden border-t border-slate-300 pt-2.5 text-[7.5pt] leading-relaxed text-slate-500 print:block">
      {children}
    </footer>
  );
}
