import type { BadgeTone } from '@/components/ui/badge';

/**
 * Metadatos de las maquinas de estado de §6 de API.md: etiqueta en espanol,
 * color del badge y transiciones validas.
 *
 * Vive fuera de `features/` porque varios modulos pintan el estado de otros
 * (una compra lista sus vehiculos, una venta muestra el estado de la unidad) y
 * el mismo estado debe verse igual en toda la aplicacion.
 *
 * Las transiciones son copia de las constantes `*_TRANSITIONS` del dominio del
 * backend. Sirven para **no ofrecer** acciones que se sabe que van a fallar; la
 * autoridad sigue siendo el servidor, que las revalida.
 */

export interface StatusMeta<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly tone: BadgeTone;
}

// --- Vehiculo ----------------------------------------------------------------

export type VehicleStatus =
  | 'in_transit'
  | 'in_inventory'
  | 'reserved'
  | 'sold'
  | 'in_repair'
  | 'unavailable';

export const VEHICLE_STATUS_META: Record<VehicleStatus, StatusMeta<VehicleStatus>> = {
  in_transit: { value: 'in_transit', label: 'En transito', tone: 'blue' },
  in_inventory: { value: 'in_inventory', label: 'En inventario', tone: 'green' },
  reserved: { value: 'reserved', label: 'Reservado', tone: 'amber' },
  sold: { value: 'sold', label: 'Vendido', tone: 'purple' },
  in_repair: { value: 'in_repair', label: 'En taller', tone: 'teal' },
  unavailable: { value: 'unavailable', label: 'No disponible', tone: 'neutral' },
};

export const VEHICLE_STATUSES = Object.keys(VEHICLE_STATUS_META) as VehicleStatus[];

const VEHICLE_STATUS_TRANSITIONS: Record<VehicleStatus, readonly VehicleStatus[]> = {
  in_transit: ['in_inventory', 'in_repair', 'unavailable'],
  in_inventory: ['reserved', 'sold', 'in_repair', 'unavailable'],
  reserved: ['sold', 'in_inventory', 'unavailable'],
  in_repair: ['in_inventory', 'unavailable'],
  unavailable: ['in_transit', 'in_inventory', 'in_repair'],
  sold: ['in_inventory'],
};

/**
 * `reserved` y `sold` los produce el ciclo comercial (crear o cancelar una
 * reserva o una venta). El endpoint de cambio manual los rechaza como origen y
 * como destino, asi que nunca se ofrecen en el selector.
 */
export const MANUALLY_ASSIGNABLE_VEHICLE_STATUSES: readonly VehicleStatus[] = [
  'in_transit',
  'in_inventory',
  'in_repair',
  'unavailable',
];

export function isCommerciallyManagedStatus(status: VehicleStatus): boolean {
  return status === 'reserved' || status === 'sold';
}

/**
 * Destinos que el selector de estado puede ofrecer: los validos desde el
 * estado actual, menos los que solo fija el ciclo comercial.
 *
 * El filtro va tambien sobre el ORIGEN. Antes solo miraba el destino, asi que
 * desde `sold` devolvia `['in_inventory']` —una accion que el endpoint manual
 * rechaza, porque una unidad vendida vuelve a inventario cancelando su venta, no
 * cambiandole el estado a mano—. Hoy no se nota porque el dialogo lo tapa por su
 * cuenta con `isCommerciallyManagedStatus`, pero la trampa quedaba puesta para
 * el siguiente que llamara a esta funcion.
 */
export function assignableVehicleStatuses(from: VehicleStatus): VehicleStatus[] {
  if (isCommerciallyManagedStatus(from)) return [];

  return VEHICLE_STATUS_TRANSITIONS[from].filter((status) =>
    MANUALLY_ASSIGNABLE_VEHICLE_STATUSES.includes(status),
  );
}

/** Estados desde los que un vehiculo se puede reservar / vender / cotizar (§7). */
export const RESERVABLE_VEHICLE_STATUSES: readonly VehicleStatus[] = ['in_inventory'];
export const SELLABLE_VEHICLE_STATUSES: readonly VehicleStatus[] = ['in_inventory', 'reserved'];
export const QUOTABLE_VEHICLE_STATUSES: readonly VehicleStatus[] = VEHICLE_STATUSES.filter(
  (status) => status !== 'sold',
);

/**
 * Unidades que pueden entrar en una compra.
 *
 * Una compra es la ENTRADA de la unidad al inventario, asi que nada que ya este
 * en el ciclo comercial: una unidad vendida o reservada no se acaba de comprar.
 * Ademas cada vehiculo pertenece a una sola compra (`purchase_items.vehicle_id`
 * es UNIQUE y el backend responde `VehicleAlreadyPurchasedError`), pero eso el
 * selector no lo puede saber; al menos no ofrece lo que es imposible por estado.
 */
export const PURCHASABLE_VEHICLE_STATUSES: readonly VehicleStatus[] = VEHICLE_STATUSES.filter(
  (status) => !isCommerciallyManagedStatus(status),
);

// --- Compra ------------------------------------------------------------------

export type PurchaseStatus = 'pending' | 'in_transit' | 'received' | 'cancelled';

export const PURCHASE_STATUS_META: Record<PurchaseStatus, StatusMeta<PurchaseStatus>> = {
  pending: { value: 'pending', label: 'Pendiente', tone: 'amber' },
  in_transit: { value: 'in_transit', label: 'En transito', tone: 'blue' },
  received: { value: 'received', label: 'Recibida', tone: 'green' },
  cancelled: { value: 'cancelled', label: 'Cancelada', tone: 'red' },
};

export const PURCHASE_STATUSES = Object.keys(PURCHASE_STATUS_META) as PurchaseStatus[];

const PURCHASE_STATUS_TRANSITIONS: Record<PurchaseStatus, readonly PurchaseStatus[]> = {
  pending: ['in_transit', 'received', 'cancelled'],
  in_transit: ['received', 'cancelled'],
  received: [],
  cancelled: [],
};

export function nextPurchaseStatuses(from: PurchaseStatus): PurchaseStatus[] {
  return [...PURCHASE_STATUS_TRANSITIONS[from]];
}

/** Solo se edita el encabezado mientras la compra sigue abierta (§7). */
export function isPurchaseEditable(status: PurchaseStatus): boolean {
  return status === 'pending' || status === 'in_transit';
}

/** Una compra ya recibida no se borra. */
export function isPurchaseDeletable(status: PurchaseStatus): boolean {
  return status !== 'received';
}

// --- Cotizacion --------------------------------------------------------------

export type QuotationStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'converted';

export const QUOTATION_STATUS_META: Record<QuotationStatus, StatusMeta<QuotationStatus>> = {
  pending: { value: 'pending', label: 'Pendiente', tone: 'amber' },
  approved: { value: 'approved', label: 'Aprobada', tone: 'blue' },
  rejected: { value: 'rejected', label: 'Rechazada', tone: 'red' },
  expired: { value: 'expired', label: 'Vencida', tone: 'neutral' },
  converted: { value: 'converted', label: 'Convertida', tone: 'green' },
};

export const QUOTATION_STATUSES = Object.keys(QUOTATION_STATUS_META) as QuotationStatus[];

const QUOTATION_STATUS_TRANSITIONS: Record<QuotationStatus, readonly QuotationStatus[]> = {
  pending: ['approved', 'rejected', 'expired'],
  approved: ['converted', 'rejected', 'expired'],
  rejected: [],
  expired: [],
  converted: [],
};

/** `converted` lo fija el sistema al crear la reserva o la venta, no la UI. */
export const MANUALLY_ASSIGNABLE_QUOTATION_STATUSES: readonly QuotationStatus[] = [
  'approved',
  'rejected',
  'expired',
];

export function assignableQuotationStatuses(from: QuotationStatus): QuotationStatus[] {
  return QUOTATION_STATUS_TRANSITIONS[from].filter((status) =>
    MANUALLY_ASSIGNABLE_QUOTATION_STATUSES.includes(status),
  );
}

export function isQuotationEditable(status: QuotationStatus): boolean {
  return status === 'pending' || status === 'approved';
}

export function isQuotationDeletable(status: QuotationStatus): boolean {
  return status !== 'converted';
}

// --- Reserva -----------------------------------------------------------------

export type ReservationStatus = 'active' | 'expired' | 'converted' | 'cancelled';

export const RESERVATION_STATUS_META: Record<ReservationStatus, StatusMeta<ReservationStatus>> = {
  active: { value: 'active', label: 'Activa', tone: 'blue' },
  expired: { value: 'expired', label: 'Vencida', tone: 'neutral' },
  converted: { value: 'converted', label: 'Convertida', tone: 'green' },
  cancelled: { value: 'cancelled', label: 'Cancelada', tone: 'red' },
};

export const RESERVATION_STATUSES = Object.keys(RESERVATION_STATUS_META) as ReservationStatus[];

export function isReservationEditable(status: ReservationStatus): boolean {
  return status === 'active';
}

/** Las reservas no se borran: se cancelan (§5.10). */
export function isReservationCancellable(status: ReservationStatus): boolean {
  return status === 'active';
}

// --- Venta -------------------------------------------------------------------

export type SaleStatus = 'in_process' | 'completed' | 'cancelled';

export const SALE_STATUS_META: Record<SaleStatus, StatusMeta<SaleStatus>> = {
  in_process: { value: 'in_process', label: 'En proceso', tone: 'amber' },
  completed: { value: 'completed', label: 'Completada', tone: 'green' },
  cancelled: { value: 'cancelled', label: 'Cancelada', tone: 'red' },
};

export const SALE_STATUSES = Object.keys(SALE_STATUS_META) as SaleStatus[];

export function isSaleEditable(status: SaleStatus): boolean {
  return status === 'in_process';
}

/** `completed` exige saldo cero; `cancelled` sale de cualquiera de los dos. */
export function canCompleteSale(status: SaleStatus, fullyPaid: boolean): boolean {
  return status === 'in_process' && fullyPaid;
}

export function canCancelSale(status: SaleStatus): boolean {
  return status === 'in_process' || status === 'completed';
}

/** Solo una venta ya cancelada se puede archivar (§7). */
export function isSaleDeletable(status: SaleStatus): boolean {
  return status === 'cancelled';
}

export function acceptsPayments(status: SaleStatus): boolean {
  return status !== 'cancelled';
}

// --- Documento fiscal (facturas y notas de credito) --------------------------

/**
 * Estado de un comprobante frente a la DGII (§6 de API.md).
 *
 *   pending ──► issued ──► cancelled
 *      │  ▲        │
 *      ▼  │        ▼
 *   rejected ──► cancelled
 */
export type FiscalDocStatus = 'pending' | 'issued' | 'rejected' | 'cancelled';

export const FISCAL_DOC_STATUS_META: Record<FiscalDocStatus, StatusMeta<FiscalDocStatus>> = {
  pending: { value: 'pending', label: 'Pendiente', tone: 'amber' },
  issued: { value: 'issued', label: 'Emitida', tone: 'green' },
  rejected: { value: 'rejected', label: 'Rechazada', tone: 'red' },
  cancelled: { value: 'cancelled', label: 'Anulada', tone: 'neutral' },
};

export const FISCAL_DOC_STATUSES = Object.keys(
  FISCAL_DOC_STATUS_META,
) as FiscalDocStatus[];

/**
 * Una venta facturada no se puede cancelar: primero hay que anular el
 * comprobante. La UI lo usa para explicar el orden en vez de dejar que el
 * backend devuelva un 409.
 *
 * Bloquea **todo comprobante que no este anulado**, incluido el rechazado.
 * Antes solo listaba `pending` e `issued`, y no era lo que hace el servidor:
 * `CancelSaleUseCase` rechaza con `SaleHasActiveInvoiceError` en cuanto existe
 * una factura con `status !== 'cancelled'`. Un rechazo de la DGII se corrige y
 * se reintenta —el comprobante sigue vivo—, asi que tambien retiene la venta.
 */
export function blocksSaleCancellation(status: FiscalDocStatus): boolean {
  return status !== 'cancelled';
}

// --- Cliente -----------------------------------------------------------------

export type ClientType = 'individual' | 'company';

export const CLIENT_TYPE_META: Record<ClientType, StatusMeta<ClientType>> = {
  individual: { value: 'individual', label: 'Persona fisica', tone: 'blue' },
  company: { value: 'company', label: 'Empresa', tone: 'purple' },
};

export const CLIENT_TYPES = Object.keys(CLIENT_TYPE_META) as ClientType[];

// --- Categoria de gasto ------------------------------------------------------

export type ExpenseScope = 'general' | 'vehicle';

export const EXPENSE_SCOPE_META: Record<ExpenseScope, StatusMeta<ExpenseScope>> = {
  general: { value: 'general', label: 'General', tone: 'neutral' },
  vehicle: { value: 'vehicle', label: 'Por vehiculo', tone: 'teal' },
};
