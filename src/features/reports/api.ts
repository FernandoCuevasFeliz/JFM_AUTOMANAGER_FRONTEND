import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type {
  AccountReceivable,
  AccountsReceivableParams,
  InventoryStatusRow,
  MonthRangeParams,
  MonthlyExpensesParams,
  MonthlyExpensesRow,
  MonthlyReturnsRow,
  MonthlySalesRow,
  SalesBySalespersonParams,
  SalespersonRow,
  VehicleProfitability,
  VehicleProfitabilityParams,
} from './types';

/**
 * Reportes. Todo `GET`: por debajo son vistas, no hay nada que escribir.
 *
 * Dos formas de respuesta distintas y conviene no confundirlas:
 *  - los dos listados por documento (rentabilidad, cuentas por cobrar) van
 *    **paginados**, porque crecen con la operacion;
 *  - los agregados mensuales devuelven el **arreglo completo**, acotado por el
 *    rango de fechas.
 */
export const reportsApi = {
  /** Exige `reports:read` **y** `expenses:read`: expone costo y margen unitario. */
  vehicleProfitability(params: VehicleProfitabilityParams) {
    return api.list<VehicleProfitability>('/reports/vehicle-profitability', params as QueryParams);
  },

  /** Exige `reports:read` **y** `sales:read`: expone cliente, telefono y saldo. */
  accountsReceivable(params: AccountsReceivableParams) {
    return api.list<AccountReceivable>('/reports/accounts-receivable', params as QueryParams);
  },

  monthlySales(params: MonthRangeParams = {}) {
    return api.get<MonthlySalesRow[]>('/reports/sales-monthly', params as QueryParams);
  },

  salesBySalesperson(params: SalesBySalespersonParams = {}) {
    return api.get<SalespersonRow[]>('/reports/sales-by-salesperson', params as QueryParams);
  },

  /** Devoluciones por mes: unidades que volvieron y dinero reintegrado. */
  monthlyReturns(params: MonthRangeParams = {}) {
    return api.get<MonthlyReturnsRow[]>('/reports/returns-monthly', params as QueryParams);
  },

  monthlyExpenses(params: MonthlyExpensesParams = {}) {
    return api.get<MonthlyExpensesRow[]>('/reports/expenses-monthly', params as QueryParams);
  },

  /** Sin filtros: es la foto del inventario ahora mismo. */
  inventoryStatus() {
    return api.get<InventoryStatusRow[]>('/reports/inventory-status');
  },

};
