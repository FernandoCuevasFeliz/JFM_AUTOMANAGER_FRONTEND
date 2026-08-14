import type { Client } from '@/features/clients/types';
import type { Sale, SalePayment } from '@/features/sales/types';
import type { Vehicle } from '@/features/vehicles/types';
import { clientDisplayName } from '@/features/clients/types';
import { moneyToWords } from '@/lib/number-to-words';
import { TAX_INCLUDED, TAX_LABEL, TAX_RATE } from './company';

/**
 * Modelo de la factura.
 *
 * Se arma en el cliente a partir de `GET /sales/:id` porque la API no tiene
 * modulo de facturacion: no hay entidad "factura" que persistir ni secuencia de
 * NCF que consumir. Es una **vista** de la venta, no un documento nuevo, y por
 * eso reimprimirla siempre da el mismo resultado mientras la venta no cambie.
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
  readonly paid: number;
  readonly balance: number;
}

export interface Invoice {
  readonly saleNumber: string;
  readonly saleDate: string;
  readonly currencyCode: string;
  readonly exchangeRate: number;
  readonly salespersonName: string;
  readonly reservationNumber: string | null;
  readonly quotationNumber: string | null;
  readonly client: InvoiceParty;
  readonly lines: InvoiceLine[];
  readonly totals: InvoiceTotals;
  readonly payments: readonly SalePayment[];
  readonly isCancelled: boolean;
}

/** Redondeo a centavos: sin el, el desglose no cuadra con el total impreso. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Desglose del impuesto.
 *
 * Con `TAX_INCLUDED` el precio pactado es el total y la base se obtiene hacia
 * atras; el impuesto se calcula como la **diferencia** contra el total, no como
 * `base * tasa`, para que subtotal + impuesto sea exactamente el total incluso
 * cuando el redondeo no acompaña.
 */
function splitTax(salePrice: number): Pick<
  InvoiceTotals,
  'subtotal' | 'taxAmount' | 'total' | 'taxRate' | 'taxLabel' | 'taxIncluded'
> {
  const base = {
    taxRate: TAX_RATE,
    taxLabel: TAX_LABEL,
    taxIncluded: TAX_INCLUDED,
  };

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

/**
 * `client` y `vehicle` son opcionales: si el usuario no tiene permiso de
 * `clients:read` o `vehicles:read`, la factura sale igual con lo que ya trae la
 * venta. Un documento con menos detalle es mejor que un documento que no sale.
 */
export function buildInvoice(
  sale: Sale,
  client?: Client | null,
  vehicle?: Vehicle | null,
): Invoice {
  const totals = splitTax(sale.salePrice);

  const details = [
    `Chasis ${sale.vehicleChassisNumber}`,
    vehicle?.color ? `Color ${vehicle.color}` : null,
    vehicle?.transmissionType ? `Transmision ${vehicle.transmissionType}` : null,
    vehicle?.fuelType ? `Combustible ${vehicle.fuelType}` : null,
    vehicle?.engineNumber ? `Motor ${vehicle.engineNumber}` : null,
    typeof vehicle?.mileage === 'number'
      ? `${new Intl.NumberFormat('es-DO').format(vehicle.mileage)} km`
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    saleNumber: sale.saleNumber,
    saleDate: sale.saleDate,
    currencyCode: sale.currencyCode,
    exchangeRate: sale.exchangeRate,
    salespersonName: sale.salespersonName,
    reservationNumber: sale.reservationNumber,
    quotationNumber: sale.quotationNumber,

    client: {
      name: client ? clientDisplayName(client) : sale.clientName,
      documentLabel: client?.documentTypeName ?? null,
      documentNumber: client?.documentNumber ?? null,
      address: client?.address ?? null,
      city: client?.city ?? null,
      phone: client?.phone ?? null,
      email: client?.email ?? null,
    },

    lines: [
      {
        description: `${sale.vehicleBrandName} ${sale.vehicleModelName} ${sale.vehicleYear}`,
        details,
        quantity: 1,
        unitPrice: totals.subtotal,
        total: totals.subtotal,
      },
    ],

    totals: {
      ...totals,
      totalInWords: moneyToWords(totals.total, sale.currencyCode),
      paid: sale.totalPaid,
      balance: sale.pendingBalance,
    },

    payments: sale.payments,
    isCancelled: sale.status === 'cancelled',
  };
}
