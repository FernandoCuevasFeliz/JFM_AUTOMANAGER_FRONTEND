import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/use-auth';
import { queryKeys } from '@/lib/query-client';
import { reportsApi } from './api';
import type {
  AccountsReceivableParams,
  FiscalDocumentsParams,
  MonthRangeParams,
  MonthlyExpensesParams,
  SalesBySalespersonParams,
  VehicleProfitabilityParams,
} from './types';

/**
 * Un reporte cambia con la operacion, no con cada clic: se cachea un minuto
 * para que moverse entre pestañas no dispare una consulta agregada cada vez.
 */
const REPORT_STALE_TIME = 60_000;

/**
 * Los dos reportes de DETALLE exigen un permiso extra ademas de `reports:read`,
 * para que un reporte no sea una puerta lateral a datos que el rol no puede ver
 * por su propio modulo. Se comprueba aqui igual que en el servidor, para no
 * lanzar una peticion condenada a un 403.
 */
export function useVehicleProfitability(params: VehicleProfitabilityParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.reportProfitability(params),
    queryFn: () => reportsApi.vehicleProfitability(params),
    enabled: can('reports:read') && can('expenses:read'),
    placeholderData: (previous) => previous,
    staleTime: REPORT_STALE_TIME,
  });
}

export function useAccountsReceivable(params: AccountsReceivableParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.reportReceivable(params),
    queryFn: () => reportsApi.accountsReceivable(params),
    enabled: can('reports:read') && can('sales:read'),
    placeholderData: (previous) => previous,
    staleTime: REPORT_STALE_TIME,
  });
}

export function useMonthlySalesReport(params: MonthRangeParams = {}) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.reportSalesMonthly(params),
    queryFn: () => reportsApi.monthlySales(params),
    enabled: can('reports:read'),
    staleTime: REPORT_STALE_TIME,
  });
}

export function useSalesBySalesperson(params: SalesBySalespersonParams = {}) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.reportSalesBySalesperson(params),
    queryFn: () => reportsApi.salesBySalesperson(params),
    enabled: can('reports:read'),
    staleTime: REPORT_STALE_TIME,
  });
}

export function useMonthlyReturnsReport(params: MonthRangeParams = {}) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.reportReturnsMonthly(params),
    queryFn: () => reportsApi.monthlyReturns(params),
    enabled: can('reports:read'),
    staleTime: REPORT_STALE_TIME,
  });
}

export function useMonthlyExpensesReport(params: MonthlyExpensesParams = {}) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.reportExpensesMonthly(params),
    queryFn: () => reportsApi.monthlyExpenses(params),
    enabled: can('reports:read'),
    staleTime: REPORT_STALE_TIME,
  });
}

export function useInventoryStatusReport() {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.reportInventory,
    queryFn: () => reportsApi.inventoryStatus(),
    enabled: can('reports:read'),
    staleTime: REPORT_STALE_TIME,
  });
}

export function useFiscalDocumentsReport(params: FiscalDocumentsParams = {}) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.reportFiscal(params),
    queryFn: () => reportsApi.fiscalDocuments(params),
    enabled: can('reports:read'),
    staleTime: REPORT_STALE_TIME,
  });
}
