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
import { COMPANY } from '@/features/billing/company';
import { formatCivilDate } from '@/lib/dates';
import { formatExchangeRate, formatMoney } from '@/lib/money';
import { moneyToWords } from '@/lib/number-to-words';
import type { Sale } from '../types';
import { activeItems, returnedItems } from '../types';

export function SaleReceiptDocument({ sale }: { sale: Sale }) {
  const vigentes = activeItems(sale);
  const devueltos = returnedItems(sale);

  return (
    <PrintSheet>
      <PrintHeader title="Comprobante" subtitle="Documento interno · sin valor fiscal">
        <PrintMeta label="No." value={sale.saleNumber} mono strong />
        <PrintMeta label="Fecha" value={formatCivilDate(sale.saleDate)} mono />
        <PrintMeta label="Moneda" value={sale.currencyCode} mono />
      </PrintHeader>

      <PrintStamp tone="muted">No valido como factura fiscal</PrintStamp>

      <section className="mt-6 grid grid-cols-2 gap-6">
        <PrintBlock title="Cliente">
          <p className="text-[11pt] font-semibold leading-tight">{sale.clientName}</p>
          <dl className="mt-1.5 space-y-0.5 text-[9pt] text-slate-600">
            <PrintRow label="Venta" value={sale.saleNumber} mono />
            <PrintRow label="Fecha" value={formatCivilDate(sale.saleDate)} />
          </dl>
        </PrintBlock>

        <PrintBlock title="Operacion">
          <dl className="space-y-0.5 text-[9pt] text-slate-600">
            <PrintRow label="Vendedor" value={sale.salespersonName} />
            <PrintRow label="Tasa" value={formatExchangeRate(sale.exchangeRate)} mono />
            {sale.quotationNumber && (
              <PrintRow label="Cotizacion" value={sale.quotationNumber} mono />
            )}
            {sale.reservationNumber && (
              <PrintRow label="Reserva" value={sale.reservationNumber} mono />
            )}
          </dl>
        </PrintBlock>
      </section>

      <table className="mt-6 w-full border-collapse text-[9.5pt]">
        <thead>
          <tr className="bg-slate-900 text-white">
            <PrintTh className="w-full text-left">Descripcion</PrintTh>
            <PrintTh className="text-center">Cant.</PrintTh>
            <PrintTh className="text-right">Importe</PrintTh>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.id} className="border-b border-slate-200 align-top">
              <td className="px-2.5 py-2.5">
                <p className={item.status === 'returned' ? 'font-semibold line-through' : 'font-semibold'}>
                  {item.vehicleBrandName} {item.vehicleModelName} {item.vehicleYear}
                </p>
                <p className="mt-1 font-mono text-[8pt] leading-relaxed text-slate-500">
                  Chasis {item.vehicleChassisNumber}
                  {item.status === 'returned' && item.returnReason
                    ? ` · Devuelto: ${item.returnReason}`
                    : ''}
                </p>
              </td>
              <td className="px-2.5 py-2.5 text-center font-mono tabular-nums">
                {item.status === 'returned' ? '0' : '1'}
              </td>
              <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono font-medium tabular-nums">
                {item.status === 'returned'
                  ? formatMoney(0, sale.currencyCode)
                  : formatMoney(item.salePrice, sale.currencyCode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-5 flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1">
          <PrintSectionTitle>Son</PrintSectionTitle>
          <p className="mt-1 text-[9pt] font-semibold leading-snug">
            {moneyToWords(sale.salePrice, sale.currencyCode)}
          </p>
          {devueltos.length > 0 && (
            <p className="mt-2 text-[8.5pt] leading-relaxed text-slate-600">
              {devueltos.length} unidad(es) devuelta(s) permanecen en el historial, pero no suman al
              total vigente.
            </p>
          )}
        </div>

        <table className="w-[72mm] shrink-0 text-[9.5pt]">
          <tbody>
            <PrintTotal label="Subtotal venta" value={formatMoney(sale.salePrice, sale.currencyCode)} />
            <PrintTotal label="Cobrado" value={formatMoney(sale.totalPaid, sale.currencyCode)} />
            {sale.totalRefunded > 0 && (
              <PrintTotal label="Reembolsado" value={formatMoney(sale.totalRefunded, sale.currencyCode)} />
            )}
            <PrintTotal label="Saldo pendiente" value={formatMoney(sale.pendingBalance, sale.currencyCode)} />
            <tr className="border-t-2 border-slate-900">
              <td className="py-2 text-[10pt] font-bold uppercase tracking-wide">Total</td>
              <td className="whitespace-nowrap py-2 text-right font-mono text-[12pt] font-bold tabular-nums">
                {formatMoney(sale.salePrice, sale.currencyCode)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {sale.payments.length > 0 && (
        <section className="mt-7">
          <PrintSectionTitle>Cobros registrados</PrintSectionTitle>
          <table className="mt-2 w-full border-collapse text-[8.8pt]">
            <thead>
              <tr className="border-y border-slate-300 text-slate-600">
                <PrintTh className="text-left">Fecha</PrintTh>
                <PrintTh className="text-left">Metodo</PrintTh>
                <PrintTh className="text-left">Referencia</PrintTh>
                <PrintTh className="text-right">Monto</PrintTh>
              </tr>
            </thead>
            <tbody>
              {sale.payments.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100">
                  <td className="px-2.5 py-1.5 font-mono">{formatCivilDate(payment.paymentDate)}</td>
                  <td className="px-2.5 py-1.5">{payment.paymentMethodName}</td>
                  <td className="px-2.5 py-1.5 text-slate-600">{payment.referenceNumber ?? '-'}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-mono">
                    {formatMoney(payment.amount, payment.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-12 grid grid-cols-2 gap-12 break-inside-avoid">
        <PrintSignature label="Por el vendedor" hint={sale.salespersonName ?? COMPANY.name} />
        <PrintSignature label="Cliente" hint={sale.clientName} />
      </section>

      <PrintFooter>
        <p>
          Este comprobante resume una venta registrada en JFM AutoManager. Es un documento interno
          de soporte y no sustituye una factura con valor fiscal.
        </p>
        <p className="mt-1">
          {sale.saleNumber} · {COMPANY.name} · {vigentes.length} unidad(es) vigente(s)
        </p>
      </PrintFooter>
    </PrintSheet>
  );
}
