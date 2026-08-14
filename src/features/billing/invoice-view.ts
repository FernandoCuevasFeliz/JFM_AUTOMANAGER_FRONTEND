import type { Client } from '@/features/clients/types';
import { clientDisplayName } from '@/features/clients/types';
import type { Sale, SalePayment } from '@/features/sales/types';
import type { Vehicle } from '@/features/vehicles/types';
import { moneyToWords } from '@/lib/number-to-words';
import { TAX_INCLUDED, TAX_LABEL, TAX_RATE } from './company';
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Desglose del impuesto.
 *
 * Con `TAX_INCLUDED` el precio pactado es el total y la base sale hacia atras;
 * el impuesto se calcula como la **diferencia** contra el total, no como
 * `base * tasa`, para que subtotal + impuesto sea exactamente el total aunque
 * el redondeo no acompañe.
 */
function splitTax(salePrice: number) {
  const base = { taxRate: TAX_RATE, taxLabel: TAX_LABEL, taxIncluded: TAX_INCLUDED };

  if (TAX_RATE <= 0) {
    return { ...base, subtotal: round2(salePrice), taxAmount: 0, total: round2(salePrice) };
  }

  if (TAX_INCLUDED) {
    const total = round2(salePrice);
    const subtotal = round2(total / (1 + TAX_RATE));
    return { ...base, subtotal, taxAmount: round2(total - subtotal), total };
  }

  const subtotal = round2(salePrice);
  const taxAmount = round2(subtotal * TAX_RATE);
  return { ...base, subtotal, taxAmount, total: round2(subtotal + taxAmount) };
}

export function buildInvoiceView(
  invoice: Invoice,
  sale?: Sale | null,
  client?: Client | null,
  vehicle?: Vehicle | null,
): InvoiceView {
  const totals = splitTax(invoice.salePrice);

  const description = sale
    ? `${sale.vehicleBrandName} ${sale.vehicleModelName} ${sale.vehicleYear}`
    : 'Vehiculo';

  const details = [
    `Chasis ${invoice.vehicleChassisNumber}`,
    vehicle?.color ? `Color ${vehicle.color}` : null,
    vehicle?.transmissionType ? `Transmision ${vehicle.transmissionType}` : null,
    vehicle?.fuelType ? `Combustible ${vehicle.fuelType}` : null,
    vehicle?.engineNumber ? `Motor ${vehicle.engineNumber}` : null,
    typeof vehicle?.mileage === 'number'
      ? `${new Intl.NumberFormat('es-DO').format(vehicle.mileage)} km`
      : null,
  ].filter((value): value is string => Boolean(value));

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

    lines: [
      {
        description,
        details,
        quantity: 1,
        unitPrice: totals.subtotal,
        total: totals.subtotal,
      },
    ],

    totals: {
      ...totals,
      totalInWords: moneyToWords(totals.total, invoice.currencyCode),
      credited: invoice.creditedAmount,
      net: invoice.netAmount,
      paid: sale?.totalPaid ?? null,
      balance: sale?.pendingBalance ?? null,
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
