import type { PageQuery } from '@/lib/api-types';
import type { FiscalDocStatus } from '@/lib/status';

export type { FiscalDocStatus };

/**
 * Tipos de e-CF de la DGII (Ley 32-23).
 *
 * El tipo determina el tratamiento fiscal del comprobante y no es
 * intercambiable: se elige segun quien es el receptor y para que usa la compra.
 * `E34` no aparece al crear una factura porque es exclusivo de las notas de
 * credito, que lo fijan solas.
 */
export type NcfType = 'E31' | 'E32' | 'E34' | 'E44' | 'E45';

export const NCF_TYPE_LABELS: Readonly<Record<NcfType, string>> = {
  E31: 'Credito fiscal',
  E32: 'Consumo',
  E34: 'Nota de credito',
  E44: 'Regimen especial',
  E45: 'Gubernamental',
};

export const NCF_TYPE_HINTS: Readonly<Record<NcfType, string>> = {
  E31: 'El comprador es un contribuyente y usara el ITBIS como credito fiscal.',
  E32: 'Consumidor final. No genera credito fiscal.',
  E34: 'Corrige o anula una factura ya emitida.',
  E44: 'Receptor acogido a un regimen especial de tributacion.',
  E45: 'El comprador es una institucion del Estado.',
};

/** Tipos que puede tomar una factura. `E34` se reserva a las notas. */
export const INVOICE_NCF_TYPES: readonly NcfType[] = ['E31', 'E32', 'E44', 'E45'];

export interface CreditNote {
  readonly id: string;
  readonly invoiceId: string;
  /** Unidad devuelta que la motiva; `null` en una nota general. */
  readonly saleItemId: string | null;
  readonly ncfNumber: string | null;
  readonly reason: string;
  readonly amount: number;
  readonly status: FiscalDocStatus;
  readonly issuedAt: string | null;
  readonly dgiiTrackId: string | null;
  readonly xmlUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Comprobante fiscal, tal cual esta en la base.
 *
 * Es lo que devuelve **`POST /invoices`** y nada mas: la entidad pelada, sin los
 * datos de la venta ni las notas de credito. No confundirla con `Invoice`; el
 * resto de endpoints si devuelven la version completa.
 *
 * No tiene `deletedAt`: por ley un e-CF no se borra, su ciclo de vida se
 * gobierna por completo con `status`.
 */
export interface InvoiceRecord {
  readonly id: string;
  readonly saleId: string;
  readonly ncfType: NcfType;
  /** `null` mientras la DGII no lo ha aceptado. */
  readonly ncfNumber: string | null;
  readonly status: FiscalDocStatus;
  readonly issuedAt: string | null;
  readonly dgiiTrackId: string | null;
  readonly xmlUrl: string | null;
  readonly rejectionReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * El comprobante con todo lo que la pantalla necesita: datos de la venta, del
 * cliente, del vehiculo y las notas de credito con sus totales.
 *
 * Lo devuelven `GET /invoices`, `GET /invoices/:id`, `/by-sale/:saleId` y todas
 * las acciones de estado (`issue`, `reject`, `retry`, `cancel`) mas la emision y
 * el rechazo de notas.
 */
export interface Invoice extends InvoiceRecord {
  readonly saleNumber: string;
  /**
   * Importe **facturado**: la suma de *todas* las lineas de la venta, devueltas
   * incluidas. No baja cuando se devuelve un vehiculo — un e-CF emitido no
   * cambia de importe; lo corrige la nota de credito.
   */
  readonly salePrice: number;
  readonly currencyCode: string;
  readonly saleDate: string;
  readonly saleStatus: string;
  readonly clientName: string;
  readonly clientDocumentNumber: string;
  /** Todos los vehiculos que la factura ampara: una venta puede llevar varios. */
  readonly vehicleChassisNumbers: string[];
  readonly createdByName: string;

  readonly creditNotes: CreditNote[];
  /** Suma de las notas **emitidas**; las pendientes no cuentan aqui. */
  readonly creditedAmount: number;
  /** Importe de la venta que sigue vigente tras las notas. */
  readonly netAmount: number;
}

export interface InvoiceListParams extends PageQuery {
  search?: string;
  status?: FiscalDocStatus;
  ncfType?: NcfType;
  clientId?: string;
  saleId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// --- Reglas que la interfaz anticipa (§7 de API.md) --------------------------

/** Un comprobante emitido es inmutable salvo por su anulacion. */
export function isFiscalDocEditable(status: FiscalDocStatus): boolean {
  return status === 'pending' || status === 'rejected';
}

/** Solo se emite lo que aun no fue aceptado por la DGII. */
export function canIssue(invoice: Invoice): boolean {
  return invoice.status === 'pending';
}

/** Un rechazo se corrige y se reintenta: `/retry` lo devuelve a `pending`. */
export function canRetry(invoice: Invoice): boolean {
  return invoice.status === 'rejected';
}

/**
 * `/cancel` solo descarta un comprobante que todavia no existe para la DGII.
 * Una factura emitida llega a `cancelled` sola, cuando las notas de credito
 * cubren su importe completo.
 */
export function canCancel(invoice: Invoice): boolean {
  return invoice.status === 'pending' || invoice.status === 'rejected';
}

/**
 * Una pendiente todavia no existe para la DGII y una anulada ya no tiene
 * importe que corregir: solo una factura vigente admite notas.
 */
export function acceptsCreditNotes(invoice: Invoice): boolean {
  return invoice.status === 'issued';
}

/**
 * Importe que aun se puede acreditar.
 *
 * Descuenta tambien las notas **pendientes**: si no, se podrian preparar dos
 * que juntas superen la factura y la segunda fallaria al emitirla, cuando ya no
 * hay marcha atras.
 */
export function availableToCredit(invoice: Invoice): number {
  const comprometido = (invoice.creditNotes ?? [])
    .filter((note) => note.status === 'pending' || note.status === 'issued')
    .reduce((total, note) => total + note.amount, 0);

  return Math.max(Math.round((invoice.salePrice - comprometido) * 100) / 100, 0);
}

/**
 * ¿Es el comprobante completo o la entidad pelada de `POST /invoices`?
 *
 * Existe porque las dos formas comparten `id` y `status`, asi que a simple vista
 * se parecen. Imprimir un documento a partir de la pelada no da error: da un
 * papel con importes vacios, que es mucho peor. La pantalla comprueba esto antes
 * de pintar nada.
 */
export function isCompleteInvoice(invoice: Invoice | InvoiceRecord | undefined): invoice is Invoice {
  if (!invoice) return false;
  const candidate = invoice as Invoice;
  return typeof candidate.salePrice === 'number' && Array.isArray(candidate.creditNotes);
}

/** Formato de un e-CF: `E` + tipo (2 digitos) + secuencia (10 digitos). */
export const NCF_PATTERN = /^E\d{12}$/;

export function isValidNcfNumber(value: string): boolean {
  return NCF_PATTERN.test(value.trim().toUpperCase());
}
