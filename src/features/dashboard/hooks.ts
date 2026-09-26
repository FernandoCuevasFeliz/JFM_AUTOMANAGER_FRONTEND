import { useQueries } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/use-auth';
import { salesApi } from '@/features/sales/api';
import { lastMonths, monthRange } from '@/lib/dates';
import { queryKeys } from '@/lib/query-client';

/**
 * Serie mensual de ventas.
 *
 * **La API no expone un endpoint de "ventas por periodo".** Los unicos reportes
 * que existen son `GET /vehicles/summary`, `GET /sales/summary` y
 * `GET /expenses/vehicle-cost/:vehicleId` (§5 de API.md). En vez de inventar una
 * ruta, la serie se arma pidiendo el resumen una vez por mes con los filtros
 * `dateFrom`/`dateTo` que el endpoint si documenta.
 *
 * El costo es una peticion por mes; con 6 meses es asumible y todas se cachean
 * por separado. Si el backend anade un endpoint agregado, este hook es lo unico
 * que habria que cambiar.
 */
export function useMonthlySales(monthCount = 6) {
  const { can } = useAuth();
  const months = lastMonths(monthCount);

  const results = useQueries({
    queries: months.map((month) => {
      const range = monthRange(month);

      return {
        queryKey: queryKeys.salesSummary({ month }),
        queryFn: () => salesApi.summary({ dateFrom: range.from, dateTo: range.to }),
        enabled: can('reports:read'),
        staleTime: 5 * 60_000,
      };
    }),
  });

  const isLoading = results.some((result) => result.isLoading);
  const isError = results.some((result) => result.isError);
  const error = results.find((result) => result.isError)?.error;

  const data = months.map((month, index) => ({
    month,
    totalSales: results[index].data?.totalSales ?? 0,
    totalAmount: results[index].data?.totalAmount ?? 0,
    totalCollected: results[index].data?.totalCollected ?? 0,
    pendingBalance: results[index].data?.pendingBalance ?? 0,
  }));

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: () => results.forEach((result) => void result.refetch()),
  };
}
