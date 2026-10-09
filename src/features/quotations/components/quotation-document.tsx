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
import { COMPANY } from '@/features/documents/company';
import { splitTax } from '@/features/documents/tax';
import type { Client } from '@/features/clients/types';
import { clientDisplayName } from '@/features/clients/types';
import type { Vehicle } from '@/features/vehicles/types';
import { formatCivilDate, formatCivilDateLong, daysUntilCivil, isPastCivil } from '@/lib/dates';
import { formatMoney, formatPercentage } from '@/lib/money';
import { moneyToWords } from '@/lib/number-to-words';
import type { Quotation } from '../types';

/**
 * Cotizacion impresa.
 *
 * Documento de oferta: la vigencia va destacada arriba y repetida al pie.
 */
export function QuotationDocument({
  quotation,
  client,
  vehicle,
}: {
  quotation: Quotation;
  client?: Client | null;
  vehicle?: Vehicle | null;
}) {
  /*
   * La vigencia solo importa mientras la cotizacion sigue en juego.
   *
   * Antes bastaba con que la fecha hubiera pasado, asi que una cotizacion
   * convertida en venta hace meses, reimpresa hoy, salia sellada como
   * «vencida» —cuando lo que le paso es que se cumplio—. Cada estado terminal
   * dice lo suyo, y el que se cerro bien no lleva sello.
   */
  const enJuego = quotation.status === 'pending' || quotation.status === 'approved';
  const vencida = quotation.status === 'expired' || (enJuego && isPastCivil(quotation.validUntil));
  const dias = daysUntilCivil(quotation.validUntil);

  const sello =
    quotation.status === 'converted'
      ? null
      : quotation.status === 'rejected'
        ? 'Cotizacion rechazada'
        : vencida
          ? 'Cotizacion vencida'
          : null;

  /*
   * El desglose se centraliza para que el precio ofrecido y el total coincidan.
   */
  const impuestos = splitTax(quotation.quotedPrice);
  const { subtotal, taxAmount: impuesto, total } = impuestos;

  const detalles = [
    `Chasis ${quotation.vehicleChassisNumber}`,
    vehicle?.color ? `Color ${vehicle.color}` : null,
    vehicle?.transmissionType ? `Transmision ${vehicle.transmissionType}` : null,
    vehicle?.fuelType ? `Combustible ${vehicle.fuelType}` : null,
    typeof vehicle?.mileage === 'number'
      ? `${new Intl.NumberFormat('es-DO').format(vehicle.mileage)} km`
      : null,
  ].filter((value): value is string => Boolean(value));

  const nombreCliente = client ? clientDisplayName(client) : quotation.clientName;

  return (
    <PrintSheet>
      <PrintHeader title="Cotizacion" subtitle="Oferta comercial">
        <PrintMeta label="No." value={quotation.quotationNumber} mono strong />
        <PrintMeta label="Emitida" value={formatCivilDate(quotation.createdAt.slice(0, 10))} mono />
        <PrintMeta label="Valida hasta" value={formatCivilDate(quotation.validUntil)} mono strong />
        <PrintMeta label="Moneda" value={quotation.currencyCode} mono />
      </PrintHeader>

      {sello && <PrintStamp tone="muted">{sello}</PrintStamp>}

      <section className="mt-6 grid grid-cols-2 gap-6">
        <PrintBlock title="Cotizado a">
          <p className="text-[11pt] font-semibold leading-tight">{nombreCliente}</p>
          <dl className="mt-1.5 space-y-0.5 text-[9pt] text-slate-600">
            {client?.documentNumber && (
              <PrintRow
                label={client.documentTypeName ?? 'Documento'}
                value={client.documentNumber}
                mono
              />
            )}
            {client?.address && <PrintRow label="Direccion" value={client.address} />}
            {client?.city && <PrintRow label="Ciudad" value={client.city} />}
            {client?.phone && <PrintRow label="Telefono" value={client.phone} mono />}
            {client?.email && <PrintRow label="Correo" value={client.email} />}
          </dl>
        </PrintBlock>

        <PrintBlock title="Vigencia">
          <dl className="space-y-0.5 text-[9pt] text-slate-600">
            <PrintRow label="Valida hasta" value={formatCivilDateLong(quotation.validUntil)} />
            <PrintRow
              label="Estado"
              value={vencida ? 'Vencida' : dias === 0 ? 'Vence hoy' : `Quedan ${dias} dias`}
            />
            {quotation.createdByName && (
              <PrintRow label="Preparada por" value={quotation.createdByName} />
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
          <tr className="border-b border-slate-200 align-top">
            <td className="px-2.5 py-2.5">
              <p className="font-semibold">
                {quotation.vehicleBrandName} {quotation.vehicleModelName} {quotation.vehicleYear}
              </p>
              <p className="mt-1 font-mono text-[8pt] leading-relaxed text-slate-500">
                {detalles.join('  ·  ')}
              </p>
            </td>
            <td className="px-2.5 py-2.5 text-center font-mono tabular-nums">1</td>
            <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono font-medium tabular-nums">
              {formatMoney(subtotal, quotation.currencyCode)}
            </td>
          </tr>
        </tbody>
      </table>

      <section className="mt-5 flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1">
          <PrintSectionTitle>Son</PrintSectionTitle>
          <p className="mt-1 text-[9pt] font-semibold leading-snug">
            {moneyToWords(total, quotation.currencyCode)}
          </p>
        </div>

        <table className="w-[72mm] shrink-0 text-[9.5pt]">
          <tbody>
            <PrintTotal label="Subtotal" value={formatMoney(subtotal, quotation.currencyCode)} />
            {impuestos.taxRate > 0 && (
              <PrintTotal
                label={`${impuestos.taxLabel} (${formatPercentage(impuestos.taxRate * 100)})${
                  impuestos.taxIncluded ? ' incl.' : ''
                }`}
                value={formatMoney(impuesto, quotation.currencyCode)}
              />
            )}
            <tr className="border-t-2 border-slate-900">
              <td className="py-2 text-[10pt] font-bold uppercase tracking-wide">Total</td>
              <td className="whitespace-nowrap py-2 text-right font-mono text-[12pt] font-bold tabular-nums">
                {formatMoney(total, quotation.currencyCode)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {quotation.notes && (
        <section className="mt-7">
          <PrintSectionTitle>Observaciones</PrintSectionTitle>
          <p className="mt-1.5 whitespace-pre-line text-[9pt] leading-relaxed text-slate-700">
            {quotation.notes}
          </p>
        </section>
      )}

      <section className="mt-12 grid grid-cols-2 gap-12 break-inside-avoid">
        <PrintSignature label="Por el vendedor" hint={quotation.createdByName ?? COMPANY.name} />
        <PrintSignature label="Cliente" hint={nombreCliente} />
      </section>

      <PrintFooter>
        <p>
          Precio sujeto a la disponibilidad de la unidad y valido hasta el{' '}
          <strong className="font-semibold text-slate-700">
            {formatCivilDate(quotation.validUntil)}
          </strong>
          . Esta cotizacion es una oferta comercial y no genera obligacion de venta.
        </p>
        <p className="mt-1">
          {quotation.quotationNumber} · {COMPANY.name}
        </p>
      </PrintFooter>
    </PrintSheet>
  );
}
