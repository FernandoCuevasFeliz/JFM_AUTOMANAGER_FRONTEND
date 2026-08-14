import { Car } from 'lucide-react';
import type * as React from 'react';
import { formatCivilDate, formatCivilDateLong } from '@/lib/dates';
import { formatExchangeRate, formatMoney, formatPercentage } from '@/lib/money';
import { cn } from '@/lib/utils';
import { COMPANY, HAS_FISCAL_NUMBER, INVOICE_FOOTER_NOTE, NCF } from '../company';
import type { Invoice } from '../invoice';

/**
 * La factura, tal cual sale por la impresora.
 *
 * Va con colores fijos en vez de tokens del tema: es una hoja de papel. En modo
 * oscuro se sigue viendo blanca porque lo que se previsualiza es el impreso, no
 * la aplicacion. `print-color-adjust: exact` obliga al navegador a imprimir los
 * fondos, que por defecto descarta para ahorrar tinta.
 */
export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const { totals, client } = invoice;
  const hasBalance = totals.balance > 0.004;

  return (
    <article
      className="invoice-sheet mx-auto w-full max-w-[210mm] bg-white p-[14mm] text-[10.5pt] leading-snug text-slate-900"
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      lang="es"
    >
      {/* --- Encabezado ---------------------------------------------------- */}
      <header className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-5">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded bg-[#DC2626] text-white">
            <Car className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[13pt] font-bold leading-tight tracking-tight">{COMPANY.name}</p>
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
          <p className="text-[17pt] font-bold uppercase leading-none tracking-[0.14em] text-[#DC2626]">
            {HAS_FISCAL_NUMBER ? 'Factura' : 'Comprobante'}
          </p>

          <table className="ml-auto mt-3 text-[9pt]">
            <tbody>
              <Meta label="No." value={invoice.saleNumber} mono strong />
              {HAS_FISCAL_NUMBER && <Meta label="NCF" value={NCF} mono strong />}
              <Meta label="Fecha" value={formatCivilDate(invoice.saleDate)} mono />
              <Meta label="Moneda" value={invoice.currencyCode} mono />
              {invoice.exchangeRate !== 1 && (
                <Meta label="Tasa" value={formatExchangeRate(invoice.exchangeRate)} mono />
              )}
            </tbody>
          </table>
        </div>
      </header>

      {/* Una venta anulada no se borra del historial, pero tampoco puede salir
          por la impresora como si siguiera viva. */}
      {invoice.isCancelled && (
        <p className="mt-5 border-2 border-[#DC2626] px-4 py-2 text-center text-[11pt] font-bold uppercase tracking-[0.2em] text-[#DC2626]">
          Anulada
        </p>
      )}

      {/* --- Partes -------------------------------------------------------- */}
      <section className="mt-6 grid grid-cols-2 gap-6">
        <Block title="Facturar a">
          <p className="text-[11pt] font-semibold leading-tight">{client.name}</p>
          <dl className="mt-1.5 space-y-0.5 text-[9pt] text-slate-600">
            {client.documentNumber && (
              <Row
                label={client.documentLabel ?? 'Documento'}
                value={client.documentNumber}
                mono
              />
            )}
            {client.address && <Row label="Direccion" value={client.address} />}
            {client.city && <Row label="Ciudad" value={client.city} />}
            {client.phone && <Row label="Telefono" value={client.phone} mono />}
            {client.email && <Row label="Correo" value={client.email} />}
          </dl>
        </Block>

        <Block title="Datos de la operacion">
          <dl className="space-y-0.5 text-[9pt] text-slate-600">
            <Row label="Vendedor" value={invoice.salespersonName} />
            <Row label="Emitida" value={formatCivilDateLong(invoice.saleDate)} />
            {invoice.quotationNumber && (
              <Row label="Cotizacion" value={invoice.quotationNumber} mono />
            )}
            {invoice.reservationNumber && (
              <Row label="Reserva" value={invoice.reservationNumber} mono />
            )}
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

            <Total label="Pagado" value={formatMoney(totals.paid, invoice.currencyCode)} />

            <tr className={cn('border-t border-slate-300', hasBalance && 'text-[#DC2626]')}>
              <td className="py-1.5 font-semibold">Saldo pendiente</td>
              <td className="whitespace-nowrap py-1.5 text-right font-mono font-bold tabular-nums">
                {formatMoney(totals.balance, invoice.currencyCode)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

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
                <Th className="text-left font-semibold">Referencia</Th>
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
        <Signature label="Por el vendedor" hint={invoice.salespersonName} />
        <Signature label="Recibido conforme" hint={client.name} />
      </section>

      {/* --- Pie ----------------------------------------------------------- */}
      <footer className="mt-8 border-t border-slate-300 pt-3 text-[7.5pt] leading-relaxed text-slate-500">
        {INVOICE_FOOTER_NOTE && <p>{INVOICE_FOOTER_NOTE}</p>}

        {!HAS_FISCAL_NUMBER && (
          // Sin NCF esto no es una factura con valor fiscal, y el papel tiene que
          // decirlo. Callarlo es lo unico que aqui seria grave.
          <p className="mt-1 font-semibold text-slate-700">
            Documento interno sin valor fiscal: no lleva Numero de Comprobante Fiscal (NCF)
            autorizado por la DGII.
          </p>
        )}

        <p className="mt-1">
          {invoice.saleNumber} · Generado desde JFM AutoManager · {COMPANY.name}
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
