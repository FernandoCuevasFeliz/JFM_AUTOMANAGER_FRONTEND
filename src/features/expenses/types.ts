import type { PageQuery } from '@/lib/api-types';
import type { ExpenseScope } from '@/lib/status';

export interface Expense {
  readonly id: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly categoryScope: ExpenseScope;
  /** `null` = gasto general de la empresa, no imputable a una unidad. */
  readonly vehicleId: string | null;
  readonly vehicleChassisNumber: string | null;
  readonly currencyId: string;
  readonly currencyCode: string;
  readonly paymentMethodId: string;
  readonly paymentMethodName: string;
  readonly description: string;
  readonly amount: number;
  readonly exchangeRate: number;
  /** Fecha civil: se trata como string. */
  readonly expenseDate: string;
  readonly createdByName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface ExpenseListParams extends PageQuery {
  search?: string;
  categoryId?: string;
  vehicleId?: string;
  /** `true` deja solo gastos de empresa; `false`, solo gastos de vehiculo. */
  generalOnly?: boolean;
  paymentMethodId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Costo real y margen de una unidad (`GET /expenses/vehicle-cost/:vehicleId`).
 *
 * Solo los campos con sufijo `Converted` son sumables entre si: el resto esta
 * en la moneda original de cada documento (§5.8 de API.md).
 */
export interface VehicleCostSummary {
  readonly vehicleId: string;
  readonly reportingCurrency: string;
  readonly purchaseCurrencyCode: string | null;
  readonly purchaseExchangeRate: number | null;
  readonly purchaseCost: number | null;
  readonly freightCost: number | null;
  readonly insuranceCost: number | null;
  readonly otherPurchaseCosts: number | null;
  readonly importSubtotal: number | null;
  readonly importSubtotalConverted: number;
  readonly expensesByCurrency: { currencyCode: string; total: number; totalConverted: number }[];
  readonly expensesTotalConverted: number;
  readonly totalCostConverted: number;
  readonly listPrice: number | null;
  readonly saleCurrencyCode: string | null;
  /** `null` mientras el vehiculo no se haya vendido. */
  readonly soldPrice: number | null;
  readonly soldPriceConverted: number | null;
  readonly margin: number | null;
  readonly marginPercentage: number | null;
}
