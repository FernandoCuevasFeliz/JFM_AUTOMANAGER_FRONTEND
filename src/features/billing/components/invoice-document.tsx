import type * as React from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { formatCivilDate, formatCivilDateLong, formatDate } from '@/lib/dates';
import { formatExchangeRate, formatMoney, formatPercentage } from '@/lib/money';
import { cn } from '@/lib/utils';
import { COMPANY, INVOICE_FOOTER_NOTE } from '../company';
import type { InvoiceView } from '../invoice-view';
import { NCF_TYPE_LABELS } from '../types';

/**
 * El comprobante, tal cual sale por la impresora.
 *
 * Va con colores fijos en vez de tokens del tema: es una hoja de papel. En modo
 * oscuro se sigue viendo blanca porque lo que se previsualiza es el impreso.
 *
 * Solo se rotula como **factura con valor fiscal** cuando la DGII ya la acepto
 * y hay NCF. Mientras esta pendiente o rechazada, el papel lo dice: imprimir un
 * borrador con pinta de comprobante definitivo es la peor cosa que puede hacer
 * esta pantalla.
 */
export function InvoiceDocument({ invoice }: { invoice: InvoiceView }) {
  const { totals, client } = invoice;
  const emitida = invoice.status === 'issued' && Boolean(invoice.ncfNumber);
  const anulada = invoice.status === 'cancelled';

  return (
    <article
      className="invoice-sheet mx-auto w-full max-w-[210mm] bg-white p-[14mm] text-[10.5pt] leading-snug text-slate-900"
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      lang="es"
    >
      {/* --- Encabezado ---------------------------------------------------- */}
      <header className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-5">
        <div className="flex min-w-0 flex-col gap-2.5">
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
            {emitida ? 'Factura' : 'Borrador'}
          </p>
          <p className="mt-1 text-[8pt] font-semibold uppercase tracking-[0.06em] text-slate-500">
            e-CF {invoice.ncfType} · {NCF_TYPE_LABELS[invoice.ncfType]}
          </p>

          <table className="ml-auto mt-3 text-[9pt]">
            <tbody>
              {invoice.ncfNumber && <Meta label="NCF" value={invoice.ncfNumber} mono strong />}
              <Meta label="Venta" value={invoice.saleNumber} mono />
              <Meta label="Fecha" value={formatCivilDate(invoice.saleDate)} mono />
              {invoice.issuedAt && (
                <Meta label="Emitida" value={formatDate(invoice.issuedAt)} mono />
              )}
              <Meta label="Moneda" value={invoice.currencyCode} mono />
              {invoice.exchangeRate !== null && invoice.exchangeRate !== 1 && (
                <Meta label="Tasa" value={formatExchangeRate(invoice.exchangeRate)} mono />
              )}
            </tbody>
          </table>
        </div>
      </header>

      {/* Un comprobante que no esta emitido no puede salir por la impresora
          aparentando serlo. */}
      {!emitida && (
        <p
          className={cn(
            'mt-5 border-2 px-4 py-2 text-center text-[10pt] font-bold uppercase tracking-[0.18em]',
            anulada ? 'border-slate-500 text-slate-600' : 'border-[#DC2626] text-[#DC2626]',
          )}
        >
          {anulada
            ? 'Comprobante anulado'
            : invoice.status === 'rejected'
              ? 'Rechazado por la DGII · sin valor fiscal'
              : 'Pendiente de emision · sin valor fiscal'}
        </p>
      )}

      {/* --- Partes -------------------------------------------------------- */}
      <section className="mt-6 grid grid-cols-2 gap-6">
        <Block title="Facturar a">
          <p className="text-[11pt] font-semibold leading-tight">{client.name}</p>
          <dl className="mt-1.5 space-y-0.5 text-[9pt] text-slate-600">
            {client.documentNumber && (
              <Row label={client.documentLabel ?? 'Documento'} value={client.documentNumber} mono />
            )}
            {client.address && <Row label="Direccion" value={client.address} />}
            {client.city && <Row label="Ciudad" value={client.city} />}
            {client.phone && <Row label="Telefono" value={client.phone} mono />}
            {client.email && <Row label="Correo" value={client.email} />}
          </dl>
        </Block>

        <Block title="Datos de la operacion">
          <dl className="space-y-0.5 text-[9pt] text-slate-600">
            {invoice.salespersonName && <Row label="Vendedor" value={invoice.salespersonName} />}
            <Row label="Fecha" value={formatCivilDateLong(invoice.saleDate)} />
            {invoice.quotationNumber && (
              <Row label="Cotizacion" value={invoice.quotationNumber} mono />
            )}
            {invoice.reservationNumber && (
              <Row label="Reserva" value={invoice.reservationNumber} mono />
            )}
            {invoice.dgiiTrackId && <Row label="TrackID DGII" value={invoice.dgiiTrackId} mono />}
          </dl>
        </Block>
      </section>

      {/* --- Detalle ------------------------------------------------------- */}
      <table className="mt-6 w-full border-collapse text-[9.5pt]">
        <thead>
          <tr className="bg-slate-900 text-white">
            <Th className="w-full text-left">Descripcion</Th>
            <Th className="text-center">Cant.</Th>
            <Th className="text-right">Precio</Th>
            <Th className="text-right">Importe</Th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={index} className="border-b border-slate-200 align-top">
              <td className="px-2.5 py-2.5">
                <p className="font-semibold">{line.description}</p>
                {line.details.length > 0 && (
                  <p className="mt-1 font-mono text-[8pt] leading-relaxed text-slate-500">
                    {line.details.join('  ·  ')}
                  </p>
                )}
              </td>
              <td className="px-2.5 py-2.5 text-center font-mono tabular-nums">{line.quantity}</td>
              <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono tabular-nums">
                {formatMoney(line.unitPrice, invoice.currencyCode)}
              </td>
              <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono font-medium tabular-nums">
                {formatMoney(line.total, invoice.currencyCode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- Importe en letras + totales ----------------------------------- */}
      <section className="mt-5 flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1">
          <p className="text-[7.5pt] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Son
          </p>
          <p className="mt-1 text-[9pt] font-semibold leading-snug">{totals.totalInWords}</p>
        </div>

        <table className="w-[72mm] shrink-0 text-[9.5pt]">
          <tbody>
            <Total label="Subtotal" value={formatMoney(totals.subtotal, invoice.currencyCode)} />

            {totals.taxRate > 0 && (
              <Total
                label={`${totals.taxLabel} (${formatPercentage(totals.taxRate * 100)})${
                  totals.taxIncluded ? ' incl.' : ''
                }`}
                value={formatMoney(totals.taxAmount, invoice.currencyCode)}
              />
            )}

            <tr className="border-t-2 border-slate-900">
              <td className="py-2 text-[10pt] font-bold uppercase tracking-wide">Total</td>
              <td className="whitespace-nowrap py-2 text-right font-mono text-[12pt] font-bold tabular-nums">
                {formatMoney(totals.total, invoice.currencyCode)}
              </td>
            </tr>

            {totals.credited > 0 && (
              <>
                <Total
                  label="Notas de credito"
                  value={`− ${formatMoney(totals.credited, invoice.currencyCode)}`}
                />
                <tr className="border-t border-slate-900">
                  <td className="py-1.5 font-bold uppercase tracking-wide">Neto</td>
                  <td className="whitespace-nowrap py-1.5 text-right font-mono font-bold tabular-nums">
                    {formatMoney(totals.net, invoice.currencyCode)}
                  </td>
                </tr>
              </>
            )}

            {totals.paid !== null && (
              <Total label="Pagado" value={formatMoney(totals.paid, invoice.currencyCode)} />
            )}
            {totals.balance !== null && (
              <tr className={cn('border-t border-slate-300', totals.balance > 0.004 && 'text-[#DC2626]')}>
                <td className="py-1.5 font-semibold">Saldo pendiente</td>
                <td className="whitespace-nowrap py-1.5 text-right font-mono font-bold tabular-nums">
                  {formatMoney(totals.balance, invoice.currencyCode)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* --- Notas de credito emitidas ------------------------------------- */}
      {invoice.creditNotes.length > 0 && (
        <section className="mt-7">
          <h2 className="text-[7.5pt] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Notas de credito aplicadas
          </h2>
          <table className="mt-2 w-full border-collapse text-[9pt]">
            <thead>
              <tr className="border-y border-slate-300 text-slate-600">
                <Th className="text-left font-semibold">NCF</Th>
                <Th className="text-left font-semibold">Fecha</Th>
                <Th className="w-full text-left font-semibold">Motivo</Th>
                <Th className="text-right font-semibold">Monto</Th>
              </tr>
            </thead>
            <tbody>
              {invoice.creditNotes.map((note) => (
                <tr key={note.id} className="border-b border-slate-200">
                  <td className="whitespace-nowrap px-2.5 py-1.5 font-mono">{note.ncfNumber ?? '—'}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 font-mono tabular-nums">
                    {note.issuedAt ? formatDate(note.issuedAt) : '—'}
                  </td>
                  <td className="px-2.5 py-1.5">{note.reason}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-mono tabular-nums">
                    {formatMoney(note.amount, invoice.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* --- Estado de cuenta ---------------------------------------------- */}
      {invoice.payments.length > 0 && (
        <section className="mt-7">
          <h2 className="text-[7.5pt] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Pagos recibidos
          </h2>
          <table className="mt-2 w-full border-collapse text-[9pt]">
            <thead>
              <tr className="border-y border-slate-300 text-slate-600">
                <Th className="text-left font-semibold">Fecha</Th>
                <Th className="text-left font-semibold">Metodo</Th>
                <Th className="w-full text-left font-semibold">Referencia</Th>
                <Th className="text-right font-semibold">Monto</Th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-200">
                  <td className="whitespace-nowrap px-2.5 py-1.5 font-mono tabular-nums">
                    {formatCivilDate(payment.paymentDate)}
                  </td>
                  <td className="px-2.5 py-1.5">{payment.paymentMethodName}</td>
                  <td className="px-2.5 py-1.5 text-slate-600">{payment.referenceNumber ?? '—'}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-mono tabular-nums">
                    {formatMoney(payment.amount, payment.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* --- Firmas -------------------------------------------------------- */}
      <section className="mt-12 grid grid-cols-2 gap-12 break-inside-avoid">
        <Signature label="Por el vendedor" hint={invoice.salespersonName ?? COMPANY.name} />
        <Signature label="Recibido conforme" hint={client.name} />
      </section>

      {/* --- Pie ----------------------------------------------------------- */}
      <footer className="mt-8 border-t border-slate-300 pt-3 text-[7.5pt] leading-relaxed text-slate-500">
        {INVOICE_FOOTER_NOTE && <p>{INVOICE_FOOTER_NOTE}</p>}
        <p className="mt-1">
          {invoice.ncfNumber ?? invoice.saleNumber} · {COMPANY.name}
          {emitida && ' · Comprobante fiscal electronico autorizado por la DGII'}
        </p>
      </footer>
    </article>
  );
}

function Meta({
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

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-slate-900 pl-3">
      <h2 className="mb-1.5 text-[7.5pt] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-1.5">
      <dt className="shrink-0 text-slate-400">{label}:</dt>
      <dd className={cn('min-w-0 break-words text-slate-700', mono && 'font-mono tabular-nums')}>
        {value}
      </dd>
    </div>
  );
}

function Th({ className, children }: { className?: string; children: React.ReactNode }) {
  return <th className={cn('whitespace-nowrap px-2.5 py-1.5 font-semibold', className)}>{children}</th>;
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1 text-slate-600">{label}</td>
      <td className="whitespace-nowrap py-1 text-right font-mono tabular-nums">{value}</td>
    </tr>
  );
}

function Signature({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="text-center">
      <div className="h-px bg-slate-900" />
      <p className="mt-1.5 text-[8.5pt] font-semibold">{label}</p>
      <p className="text-[8pt] text-slate-500">{hint}</p>
    </div>
  );
}
