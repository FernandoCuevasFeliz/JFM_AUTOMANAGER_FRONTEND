import type { PageQuery } from '@/lib/api-types';
import type { SaleStatus } from '@/lib/status';

export type { SaleStatus };

/**
 * Estado de una linea de venta.
 *
 * `returned` es definitivo y **nunca borra la fila**: el vehiculo volvio, pero
 * la operacion ocurrio y sigue siendo consultable. La linea sale del total
 * vigente sin reescribir el historico.
 */
export type SaleItemStatus = 'active' | 'returned';

/** Una linea de venta = un vehiculo con su precio pactado. */
export interface SaleItem {
  readonly id: string;
  readonly saleId: string;
  readonly vehicleId: string;
  readonly salePrice: number;
  readonly status: SaleItemStatus;
  readonly returnedAt: string | null;
  readonly returnReason: string | null;

  readonly vehicleChassisNumber: string;
  readonly vehicleBrandName: string;
  readonly vehicleModelName: string;
  readonly vehicleYear: number;

  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SalePayment {
  readonly id: string;
  readonly saleId: string;
  readonly paymentMethodId: string;
  readonly paymentMethodName: string;
  readonly currencyId: string;
  readonly currencyCode: string;
  readonly amount: number;
  /** Fecha civil. */
  readonly paymentDate: string;
  readonly referenceNumber: string | null;
  readonly receivedByName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Dinero devuelto al cliente.
 *
 * Vive aparte de los cobros a proposito: un abono negativo habria roto el
 * significado de `payments`, que responde "cuanto entro", no "cuanto neto".
 * Lleva ademas su propia tasa —la del dia en que sale el dinero, no la de la
 * venta— por el mismo criterio de costo historico que usan compras y gastos.
 */
export interface SaleRefund {
  readonly id: string;
  readonly saleId: string;
  /** `null` = reembolso general de la venta, no atado a una unidad devuelta. */
  readonly saleItemId: string | null;
  readonly refundMethodId: string;
  readonly refundMethodName: string;
  readonly currencyId: string;
  readonly currencyCode: string;
  readonly amount: number;
  readonly exchangeRate: number;
  /** Fecha civil. */
  readonly refundDate: string;
  readonly reason: string;
  readonly processedByName: string | null;
  /** Chasis de la unidad devuelta; `null` en un reembolso general. */
  readonly vehicleChassisNumber: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Cabecera de la venta.
 *
 * **Una venta puede llevar varios vehiculos.** El chasis, la marca y el modelo
 * ya no viven en la raiz: hay uno por linea, dentro de `items`. Una venta de
 * tres vehiculos no tiene "un" chasis.
 *
 * `salePrice` es **derivado**: la suma de las lineas vigentes, calculada por el
 * backend. No se envia al crear ni al editar; se corrige linea a linea.
 */
export interface Sale {
  readonly id: string;
  /** Generado por el backend: `VEN-2026-000001`. */
  readonly saleNumber: string;
  readonly reservationId: string | null;
  readonly reservationNumber: string | null;
  readonly quotationId: string | null;
  readonly quotationNumber: string | null;
  readonly clientId: string;
  readonly clientName: string;
  readonly currencyId: string;
  readonly currencyCode: string;
  readonly exchangeRate: number;
  /** Fecha civil. */
  readonly saleDate: string;
  readonly salespersonId: string;
  readonly salespersonName: string;
  readonly status: SaleStatus;

  readonly items: SaleItem[];
  /** Derivado: suma de las lineas `active`. */
  readonly salePrice: number;

  readonly payments: SalePayment[];
  readonly refunds: SaleRefund[];
  /** Bruto cobrado. */
  readonly totalPaid: number;
  readonly totalRefunded: number;
  /** Cobrado menos devuelto: lo que la empresa realmente retiene. */
  readonly netPaid: number;
  /** `salePrice` − `netPaid`. */
  readonly pendingBalance: number;

  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

/** Estado de cuenta suelto (`GET /sales/:id/payments`). */
export interface SaleAccount {
  readonly payments: SalePayment[];
  readonly refunds: SaleRefund[];
  readonly salePrice: number;
  readonly totalPaid: number;
  readonly totalRefunded: number;
  readonly netPaid: number;
  readonly pendingBalance: number;
}

/** Respuesta al registrar un abono. */
export interface RegisterPaymentResult {
  readonly payment: SalePayment;
  readonly totalPaid: number;
  readonly pendingBalance: number;
  /** Habilita el boton de completar la venta. */
  readonly fullyPaid: boolean;
}

/** Respuesta al registrar un reembolso. */
export interface RegisterRefundResult {
  readonly refund: SaleRefund;
  readonly totalPaid: number;
  readonly totalRefunded: number;
  readonly netPaid: number;
}

export interface SalesSummary {
  readonly reportingCurrency: string;
  /** Documentos de venta. */
  readonly totalSales: number;
  /** Unidades vendidas: desde que una venta lleva varias, son cifras distintas. */
  readonly totalVehicles: number;
  readonly totalAmount: number;
  readonly totalCollected: number;
  readonly totalRefunded: number;
  readonly pendingBalance: number;
}

export interface SaleListParams extends PageQuery {
  /** Busca tambien por el chasis de cualquiera de los vehiculos de la venta. */
  search?: string;
  clientId?: string;
  /** Encuentra la venta que contiene ese vehiculo. */
  vehicleId?: string;
  salespersonId?: string;
  status?: SaleStatus;
  dateFrom?: string;
  dateTo?: string;
}

/** El resumen no acepta `search` ni `vehicleId`. */
export interface SalesSummaryParams {
  clientId?: string;
  salespersonId?: string;
  status?: SaleStatus;
  dateFrom?: string;
  dateTo?: string;
}

// --- Ayudas de lectura -------------------------------------------------------

/** Lineas que siguen contando: las devueltas salen del total. */
export function activeItems(sale: Sale): SaleItem[] {
  return sale.items.filter((item) => item.status === 'active');
}

export function returnedItems(sale: Sale): SaleItem[] {
  return sale.items.filter((item) => item.status === 'returned');
}

/**
 * Como nombrar una venta en una sola linea.
 *
 * Con un vehiculo se dice cual; con varios no se puede elegir uno sin mentir,
 * asi que se cuenta cuantos.
 */
export function saleVehicleLabel(sale: Sale): string {
  const activos = activeItems(sale);
  if (activos.length === 0) return 'Sin unidades vigentes';
  if (activos.length === 1) {
    const item = activos[0];
    return `${item.vehicleBrandName} ${item.vehicleModelName} ${item.vehicleYear}`;
  }
  return `${activos.length} vehiculos`;
}

/** Chasis de las unidades vigentes, para buscar y para el papel. */
export function saleChassisNumbers(sale: Sale): string[] {
  return activeItems(sale).map((item) => item.vehicleChassisNumber);
}

/**
 * Una linea no se puede quitar si es la ultima que queda: para eso se cancela
 * la venta entera. Quitar y devolver no son lo mismo (§5.11 de API.md).
 */
export function canRemoveItem(sale: Sale, item: SaleItem): boolean {
  return (
    sale.status === 'in_process' &&
    item.status === 'active' &&
    activeItems(sale).length > 1
  );
}

/** Devolver admite incluso una venta ya completada: el cliente se arrepiente. */
export function canReturnItem(sale: Sale, item: SaleItem): boolean {
  return item.status === 'active' && sale.status !== 'cancelled';
}

/** Techo de un reembolso: lo cobrado menos lo ya devuelto. */
export function refundableAmount(sale: Sale): number {
  return Math.max(Math.round((sale.totalPaid - sale.totalRefunded) * 100) / 100, 0);
}

/** Totales recalculados desde los movimientos visibles en el comprobante. */
export function saleAccountTotals(sale: Pick<Sale, 'salePrice' | 'payments' | 'refunds'>) {
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const paid = round(sale.payments.reduce((total, payment) => total + payment.amount, 0));
  const refunded = round(sale.refunds.reduce((total, refund) => total + refund.amount, 0));
  const netPaid = round(paid - refunded);
  const balance = Math.max(round(sale.salePrice - netPaid), 0);

  return { paid, refunded, netPaid, balance };
}
