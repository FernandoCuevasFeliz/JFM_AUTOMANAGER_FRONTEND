import {
  PrintBlock,
  PrintFooter,
  PrintHeader,
  PrintMeta,
  PrintRow,
  PrintSectionTitle,
  PrintSheet,
  PrintSignature,
  PrintStamp,
  PrintTh,
  PrintTotal,
} from '@/components/print-sheet';
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
    <PrintSheet>
      {/* --- Encabezado ---------------------------------------------------- */}
      <PrintHeader
        title={emitida ? 'Factura' : 'Borrador'}
        subtitle={`e-CF ${invoice.ncfType} · ${NCF_TYPE_LABELS[invoice.ncfType]}`}
      >
        {invoice.ncfNumber && <PrintMeta label="NCF" value={invoice.ncfNumber} mono strong />}
        <PrintMeta label="Venta" value={invoice.saleNumber} mono />
        <PrintMeta label="Fecha" value={formatCivilDate(invoice.saleDate)} mono />
        {invoice.issuedAt && <PrintMeta label="Emitida" value={formatDate(invoice.issuedAt)} mono />}
        <PrintMeta label="Moneda" value={invoice.currencyCode} mono />
        {invoice.exchangeRate !== null && invoice.exchangeRate !== 1 && (
          <PrintMeta label="Tasa" value={formatExchangeRate(invoice.exchangeRate)} mono />
        )}
      </PrintHeader>

      {/* Un comprobante que no esta emitido no puede salir por la impresora
          aparentando serlo. */}
      {!emitida && (
        <PrintStamp tone={anulada ? 'muted' : 'alert'}>
          {anulada
            ? 'Comprobante anulado'
            : invoice.status === 'rejected'
              ? 'Rechazado por la DGII · sin valor fiscal'
              : 'Pendiente de emision · sin valor fiscal'}
        </PrintStamp>
      )}

      {/* --- Partes -------------------------------------------------------- */}
      <section className="mt-6 grid grid-cols-2 gap-6">
        <PrintBlock title="Facturar a">
          <p className="text-[11pt] font-semibold leading-tight">{client.name}</p>
          <dl className="mt-1.5 space-y-0.5 text-[9pt] text-slate-600">
            {client.documentNumber && (
              <PrintRow
                label={client.documentLabel ?? 'Documento'}
                value={client.documentNumber}
                mono
              />
            )}
            {client.address && <PrintRow label="Direccion" value={client.address} />}
            {client.city && <PrintRow label="Ciudad" value={client.city} />}
            {client.phone && <PrintRow label="Telefono" value={client.phone} mono />}
            {client.email && <PrintRow label="Correo" value={client.email} />}
          </dl>
        </PrintBlock>

        <PrintBlock title="Datos de la operacion">
          <dl className="space-y-0.5 text-[9pt] text-slate-600">
            {invoice.salespersonName && (
              <PrintRow label="Vendedor" value={invoice.salespersonName} />
            )}
            <PrintRow label="Fecha" value={formatCivilDateLong(invoice.saleDate)} />
            {invoice.quotationNumber && (
              <PrintRow label="Cotizacion" value={invoice.quotationNumber} mono />
            )}
            {invoice.reservationNumber && (
              <PrintRow label="Reserva" value={invoice.reservationNumber} mono />
            )}
            {invoice.dgiiTrackId && (
              <PrintRow label="TrackID DGII" value={invoice.dgiiTrackId} mono />
            )}
          </dl>
        </PrintBlock>
      </section>

      {/* --- Detalle ------------------------------------------------------- */}
      <table className="mt-6 w-full border-collapse text-[9.5pt]">
        <thead>
          <tr className="bg-slate-900 text-white">
            <PrintTh className="w-full text-left">Descripcion</PrintTh>
            <PrintTh className="text-center">Cant.</PrintTh>
            <PrintTh className="text-right">Precio</PrintTh>
            <PrintTh className="text-right">Importe</PrintTh>
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
            <PrintTotal
              label="Subtotal"
              value={formatMoney(totals.subtotal, invoice.currencyCode)}
            />

            {totals.taxRate > 0 && (
              <PrintTotal
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
                <PrintTotal
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
              <PrintTotal label="Pagos aplicados" value={`− ${formatMoney(totals.paid, invoice.currencyCode)}`} />
            )}
            {totals.balance !== null && (
              <tr className={cn('border-t-2 border-slate-900', totals.balance > 0.004 && 'text-[#DC2626]')}>
                <td className="py-2 text-[10pt] font-bold uppercase tracking-wide">Saldo por pagar</td>
                <td className="whitespace-nowrap py-2 text-right font-mono text-[12pt] font-bold tabular-nums">
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
          <PrintSectionTitle>Notas de credito aplicadas</PrintSectionTitle>
          <table className="mt-2 w-full border-collapse text-[9pt]">
            <thead>
              <tr className="border-y border-slate-300 text-slate-600">
                <PrintTh className="text-left font-semibold">NCF</PrintTh>
                <PrintTh className="text-left font-semibold">Fecha</PrintTh>
                <PrintTh className="w-full text-left font-semibold">Motivo</PrintTh>
                <PrintTh className="text-right font-semibold">Monto</PrintTh>
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
          <PrintSectionTitle>Pagos recibidos</PrintSectionTitle>
          <table className="mt-2 w-full border-collapse text-[9pt]">
            <thead>
              <tr className="border-y border-slate-300 text-slate-600">
                <PrintTh className="text-left font-semibold">Fecha</PrintTh>
                <PrintTh className="text-left font-semibold">Metodo</PrintTh>
                <PrintTh className="w-full text-left font-semibold">Referencia</PrintTh>
                <PrintTh className="text-right font-semibold">Monto</PrintTh>
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
        <PrintSignature label="Por el vendedor" hint={invoice.salespersonName ?? COMPANY.name} />
        <PrintSignature label="Recibido conforme" hint={client.name} />
      </section>

      {/* --- Pie ----------------------------------------------------------- */}
      <PrintFooter>
        {INVOICE_FOOTER_NOTE && <p>{INVOICE_FOOTER_NOTE}</p>}
        <p className="mt-1">
          {invoice.ncfNumber ?? invoice.saleNumber} · {COMPANY.name}
          {emitida && ' · Comprobante fiscal electronico autorizado por la DGII'}
        </p>
      </PrintFooter>
    </PrintSheet>
  );
}
