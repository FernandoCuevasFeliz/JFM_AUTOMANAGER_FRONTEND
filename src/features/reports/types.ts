import type { PageQuery } from '@/lib/api-types';
import type { NcfType } from '@/features/billing/types';
import type {
  ExpenseScope,
  FiscalDocStatus,
  SaleStatus,
  VehicleStatus,
} from '@/lib/status';

/**
 * Modelos de LECTURA de los reportes.
 *
 * No hay entidades con reglas aqui: un reporte es una fotografia agregada. Por
 * eso son interfaces planas y todos los endpoints son `GET`.
 *
 * **Regla de las monedas**: cada fila trae el importe en la moneda del documento
 * (`currencyCode`) y su equivalente en la moneda de reporte, con sufijo
 * `Converted`, calculado con la tasa registrada en cada documento. Solo los
 * `Converted` son sumables entre monedas distintas; sumar `totalAmount` de una
 * fila en dolares con otra en pesos da un numero que no significa nada.
 */

/** La moneda en la que el backend consolida (`domain/shared/money.ts`). */
export const REPORT_CURRENCY = 'DOP';

/** Un mes de calendario, expresado como su primer dia: `YYYY-MM-01`. */
export type ReportMonth = string;

// --- Rentabilidad por vehiculo ----------------------------------------------

export interface VehicleProfitability {
  readonly vehicleId: string;
  readonly chassisNumber: string;
  readonly brandName: string;
  readonly modelName: string;
  readonly year: number;
  readonly status: VehicleStatus;
  readonly isActive: boolean;
  /** Precio de lista del inventario; no es lo que se cobro. */
  readonly listPrice: number | null;
  readonly purchaseCurrencyCode: string | null;
  readonly purchaseExchangeRate: number | null;
  readonly importSubtotal: number;
  readonly importSubtotalConverted: number;
  readonly expensesTotalConverted: number;
  readonly totalCostConverted: number;
  /** Todo lo relativo a la venta es `null` mientras la unidad no se venda. */
  readonly saleId: string | null;
  /** Linea de la venta que contiene esta unidad. */
  readonly saleItemId: string | null;
  readonly saleNumber: string | null;
  readonly saleStatus: SaleStatus | null;
  readonly saleDate: string | null;
  readonly saleCurrencyCode: string | null;
  readonly soldPrice: number | null;
  readonly soldPriceConverted: number | null;
  readonly margin: number | null;
  /** `null` tambien cuando el costo es cero: el porcentaje no estaria definido. */
  readonly marginPercentage: number | null;
}

export interface VehicleProfitabilityParams extends PageQuery {
  search?: string;
  status?: VehicleStatus;
  vehicleId?: string;
  /** `true` deja solo lo vendido; `false`, solo lo que sigue en stock. */
  sold?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

// --- Cuentas por cobrar ------------------------------------------------------

export interface AccountReceivable {
  readonly saleId: string;
  readonly saleNumber: string;
  readonly saleDate: string;
  readonly saleStatus: SaleStatus;
  readonly clientId: string;
  readonly clientName: string;
  readonly clientPhone: string;
  /** Unidades que siguen vendidas y unidades devueltas. */
  readonly activeItems: number;
  readonly returnedItems: number;
  /** Chasis de los vehiculos vigentes de la venta. */
  readonly chassisNumbers: string[];
  readonly salespersonId: string;
  readonly salespersonName: string;
  readonly currencyCode: string;
  readonly exchangeRate: number;
  /** Suma de las lineas vigentes: un vehiculo devuelto deja de contar. */
  readonly salePrice: number;
  readonly totalPaid: number;
  readonly totalRefunded: number;
  /**
   * `salePrice` − (cobrado − reembolsado). Los reembolsos **suman** al saldo:
   * devolverle dinero al cliente deshace un cobro, asi que ese importe vuelve a
   * estar pendiente sobre lo que quede vendido.
   */
  readonly pendingBalance: number;
  readonly pendingBalanceConverted: number;
  /** Dias transcurridos desde la fecha de la venta. */
  readonly daysOutstanding: number;
}

export interface AccountsReceivableParams extends PageQuery {
  search?: string;
  clientId?: string;
  salespersonId?: string;
  /** El backend asume `true`: una venta saldada no es una cuenta por cobrar. */
  onlyPending?: boolean;
  minDaysOutstanding?: number;
  dateFrom?: string;
  dateTo?: string;
}

// --- Agregados mensuales -----------------------------------------------------

/** Rango de meses. El backend lleva cualquier dia al mes al que pertenece. */
export interface MonthRangeParams {
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
}

export interface MonthlySalesRow {
  readonly month: ReportMonth;
  readonly currencyCode: string;
  /** Documentos de venta. */
  readonly salesCount: number;
  /** Unidades entregadas. Solo cuentan las lineas vigentes. */
  readonly vehiclesCount: number;
  readonly totalAmount: number;
  readonly totalAmountConverted: number;
}

export interface SalespersonRow extends MonthlySalesRow {
  readonly salespersonId: string;
  readonly salespersonName: string;
}

export interface SalesBySalespersonParams extends MonthRangeParams {
  salespersonId?: string;
}

export interface MonthlyExpensesRow {
  readonly month: ReportMonth;
  readonly categoryId: string;
  readonly categoryName: string;
  /** Alcance real del gasto: `vehicle` si quedo imputado a una unidad. */
  readonly scope: ExpenseScope;
  readonly currencyCode: string;
  readonly expenseCount: number;
  readonly totalAmount: number;
  readonly totalAmountConverted: number;
}

export interface MonthlyExpensesParams extends MonthRangeParams {
  categoryId?: string;
  scope?: ExpenseScope;
}

// --- Devoluciones -----------------------------------------------------------

/**
 * Devoluciones por mes.
 *
 * Leido junto al reporte de ventas da la **tasa de devolucion** del periodo:
 * cuantas unidades volvieron sobre cuantas se entregaron.
 */
export interface MonthlyReturnsRow {
  readonly month: ReportMonth;
  readonly currencyCode: string;
  /** Unidades devueltas. */
  readonly returnedCount: number;
  /** Ventas distintas afectadas por una devolucion en el mes. */
  readonly salesCount: number;
  readonly totalAmount: number;
  readonly totalAmountConverted: number;
  /** Dinero efectivamente devuelto al cliente por esas unidades. */
  readonly totalRefunded: number;
  readonly totalRefundedConverted: number;
}

// --- Inventario --------------------------------------------------------------

export interface InventoryStatusRow {
  readonly status: VehicleStatus;
  readonly vehicleCount: number;
}

// --- Comprobantes fiscales ---------------------------------------------------

export type FiscalDocumentKind = 'invoice' | 'credit_note';

export const FISCAL_DOCUMENT_KINDS: readonly FiscalDocumentKind[] = ['invoice', 'credit_note'];

export const FISCAL_DOCUMENT_KIND_LABELS: Record<FiscalDocumentKind, string> = {
  invoice: 'Factura',
  credit_note: 'Nota de credito',
};

export interface FiscalDocumentsRow {
  /** Mes de emision; el de registro mientras el comprobante siga sin emitirse. */
  readonly month: ReportMonth;
  readonly documentKind: FiscalDocumentKind;
  /** Las notas de credito son siempre E34. */
  readonly ncfType: NcfType;
  readonly status: FiscalDocStatus;
  readonly currencyCode: string;
  readonly documentCount: number;
  readonly totalAmount: number;
  readonly totalAmountConverted: number;
}

export interface FiscalDocumentsParams extends MonthRangeParams {
  documentKind?: FiscalDocumentKind;
  ncfType?: NcfType;
  status?: FiscalDocStatus;
}

// --- Ayudas ------------------------------------------------------------------

/**
 * Suma los importes ya convertidos a la moneda de reporte.
 *
 * Existe para que ninguna pantalla caiga en la tentacion de sumar `totalAmount`,
 * que mezcla monedas.
 */
export function sumConverted<T>(rows: readonly T[], pick: (row: T) => number): number {
  return Math.round(rows.reduce((total, row) => total + pick(row), 0) * 100) / 100;
}

/** `2026-03-01` → `mar 2026`, para los ejes de las graficas. */
export function monthKey(month: ReportMonth): string {
  return month.slice(0, 7);
}
