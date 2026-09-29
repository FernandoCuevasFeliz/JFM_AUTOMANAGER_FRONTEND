import type { Client } from '@/features/clients/types';
import { clientDisplayName } from '@/features/clients/types';
import type { Sale, SalePayment } from '@/features/sales/types';
import type { Vehicle } from '@/features/vehicles/types';
import { moneyToWords } from '@/lib/number-to-words';
import { round2, splitTax } from './tax';
import type { CreditNote, Invoice, NcfType } from './types';

/**
 * Modelo de impresion de un comprobante.
 *
 * La verdad fiscal (NCF, tipo, estado, notas de credito) sale de `/invoices`.
 * La venta, el cliente y el vehiculo solo **enriquecen** el papel con datos que
 * el comprobante no guarda: direccion del receptor, ficha de la unidad y estado
 * de cuenta. Si el usuario no tiene permiso para leerlos, el documento sale
 * igual con menos detalle.
 */

export interface InvoiceParty {
  readonly name: string;
  readonly documentLabel: string | null;
  readonly documentNumber: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly phone: string | null;
  readonly email: string | null;
}

export interface InvoiceLine {
  readonly description: string;
  readonly details: string[];
  readonly quantity: number;
  readonly unitPrice: number;
  readonly total: number;
}

export interface InvoiceTotals {
  readonly subtotal: number;
  readonly taxLabel: string;
  readonly taxRate: number;
  readonly taxAmount: number;
  readonly taxIncluded: boolean;
  readonly total: number;
  readonly totalInWords: string;
  readonly credited: number;
  readonly net: number;
  readonly paid: number | null;
  readonly balance: number | null;
}

export interface InvoiceView {
  readonly ncfType: NcfType;
  readonly ncfNumber: string | null;
  readonly status: Invoice['status'];
  readonly issuedAt: string | null;
  readonly dgiiTrackId: string | null;

  readonly saleNumber: string;
  readonly saleDate: string;
  readonly currencyCode: string;
  readonly exchangeRate: number | null;
  readonly salespersonName: string | null;
  readonly reservationNumber: string | null;
  readonly quotationNumber: string | null;

  readonly client: InvoiceParty;
  readonly lines: InvoiceLine[];
  readonly totals: InvoiceTotals;
  readonly payments: readonly SalePayment[];
  readonly creditNotes: readonly CreditNote[];
}

export function buildInvoiceView(
  invoice: Invoice,
  sale?: Sale | null,
  client?: Client | null,
  vehicle?: Vehicle | null,
): InvoiceView {
  const totals = splitTax(invoice.salePrice);
  const paid = sale
    ? round2(sale.payments.reduce((sum, payment) => sum + payment.amount, 0))
    : null;
  const refunded = sale
    ? round2(sale.refunds.reduce((sum, refund) => sum + refund.amount, 0))
    : null;
  const balance =
    paid === null || refunded === null ? null : Math.max(round2(invoice.netAmount - (paid - refunded)), 0);

  /*
   * Una linea del impreso por cada vehiculo de la venta.
   *
   * El comprobante ampara TODAS las unidades, devueltas incluidas: su importe
   * es lo que se facturo y no baja porque el cliente devuelva algo — eso lo
   * corrige la nota de credito. Por eso no se filtran las lineas por estado.
   *
   * Si no hay permiso para leer la venta, se cae a los chasis que el propio
   * comprobante ya trae: menos detalle, pero el papel sale.
   */
  const lineasVenta = sale?.items ?? [];

  const lines: InvoiceLine[] =
    lineasVenta.length > 0
      ? lineasVenta.map((item) => ({
          description: `${item.vehicleBrandName} ${item.vehicleModelName} ${item.vehicleYear}`,
          details: [
            `Chasis ${item.vehicleChassisNumber}`,
            item.status === 'returned' ? 'Unidad devuelta' : null,
            ...(vehicle && vehicle.id === item.vehicleId ? detallesDeFicha(vehicle) : []),
          ].filter((value): value is string => Boolean(value)),
          quantity: 1,
          unitPrice: item.salePrice,
          total: item.salePrice,
        }))
      : (invoice.vehicleChassisNumbers ?? []).map((chassis) => ({
          description: 'Vehiculo',
          details: [`Chasis ${chassis}`],
          quantity: 1,
          unitPrice: 0,
          total: 0,
        }));

  /*
   * El desglose de impuesto se aplica al TOTAL, no linea a linea: repartirlo
   * por unidad y volver a sumar deja descuadres de centavos contra el total que
   * el backend calculo.
   */
  const proporcion = totals.total > 0 ? totals.subtotal / totals.total : 1;
  const lineasConBase = lines.map((line) => ({
    ...line,
    unitPrice: round2(line.unitPrice * proporcion),
    total: round2(line.total * proporcion),
  }));

  return {
    ncfType: invoice.ncfType,
    ncfNumber: invoice.ncfNumber,
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    dgiiTrackId: invoice.dgiiTrackId,

    saleNumber: invoice.saleNumber,
    saleDate: invoice.saleDate,
    currencyCode: invoice.currencyCode,
    exchangeRate: sale?.exchangeRate ?? null,
    salespersonName: sale?.salespersonName ?? null,
    reservationNumber: sale?.reservationNumber ?? null,
    quotationNumber: sale?.quotationNumber ?? null,

    client: {
      name: client ? clientDisplayName(client) : invoice.clientName,
      documentLabel: client?.documentTypeName ?? (invoice.clientDocumentNumber ? 'Documento' : null),
      documentNumber: client?.documentNumber ?? invoice.clientDocumentNumber ?? null,
      address: client?.address ?? null,
      city: client?.city ?? null,
      phone: client?.phone ?? null,
      email: client?.email ?? null,
    },

    lines: lineasConBase,

    totals: {
      ...totals,
      totalInWords: moneyToWords(totals.total, invoice.currencyCode),
      credited: invoice.creditedAmount,
      net: invoice.netAmount,
      paid,
      balance,
    },

    payments: sale?.payments ?? [],
    // Solo las emitidas alteran el importe del documento; una nota pendiente
    // todavia no existe para la DGII y no tiene por que salir en el papel.
    //
    // El `?? []` no es paranoia: `POST /invoices` devuelve la entidad pelada,
    // sin `creditNotes`, y basta con que ese objeto llegue a la cache para que
    // esta linea reviente. Los hooks ya no lo cachean, pero el documento no
    // deberia depender de eso.
    creditNotes: (invoice.creditNotes ?? []).filter((note) => note.status === 'issued'),
  };
}

/** Detalles que solo estan en la ficha del vehiculo, no en la venta. */
function detallesDeFicha(vehicle: Vehicle): string[] {
  return [
    vehicle.color ? `Color ${vehicle.color}` : null,
    vehicle.transmissionType ? `Transmision ${vehicle.transmissionType}` : null,
    vehicle.fuelType ? `Combustible ${vehicle.fuelType}` : null,
    vehicle.engineNumber ? `Motor ${vehicle.engineNumber}` : null,
    typeof vehicle.mileage === 'number'
      ? `${new Intl.NumberFormat('es-DO').format(vehicle.mileage)} km`
      : null,
  ].filter((value): value is string => Boolean(value));
}
