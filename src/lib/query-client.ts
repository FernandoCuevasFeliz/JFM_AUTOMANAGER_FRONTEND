import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './api-error';

/**
 * Politica de reintentos: solo tiene sentido insistir ante fallos de red o del
 * servidor. Un 4xx es una respuesta correcta a una peticion mal planteada y
 * reintentarlo solo retrasa el mensaje al usuario.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (!isApiError(error)) return false;
  if (error.code === 'NETWORK_ERROR') return true;
  return error.status >= 500;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      // Los listados se revalidan al volver a la pestana, pero no en cada
      // montaje: en un ERP se navega mucho entre listado y detalle.
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Claves de query. Centralizarlas evita invalidaciones que no coinciden con lo
 * que realmente se cacheo.
 */
export const queryKeys = {
  catalogs: ['catalogs'] as const,
  brands: (params?: unknown) => ['vehicle-brands', params] as const,
  models: (params?: unknown) => ['vehicle-models', params] as const,

  vehicles: (params?: unknown) => ['vehicles', params] as const,
  vehicle: (id: string) => ['vehicles', 'detail', id] as const,
  vehicleImages: (id: string) => ['vehicles', 'images', id] as const,
  vehiclesSummary: ['vehicles', 'summary'] as const,
  vehicleCost: (id: string) => ['expenses', 'vehicle-cost', id] as const,

  clients: (params?: unknown) => ['clients', params] as const,
  client: (id: string) => ['clients', 'detail', id] as const,

  suppliers: (params?: unknown) => ['suppliers', params] as const,
  supplier: (id: string) => ['suppliers', 'detail', id] as const,

  purchases: (params?: unknown) => ['purchases', params] as const,
  purchase: (id: string) => ['purchases', 'detail', id] as const,

  expenses: (params?: unknown) => ['expenses', params] as const,
  expense: (id: string) => ['expenses', 'detail', id] as const,

  quotations: (params?: unknown) => ['quotations', params] as const,
  quotation: (id: string) => ['quotations', 'detail', id] as const,

  reservations: (params?: unknown) => ['reservations', params] as const,
  reservation: (id: string) => ['reservations', 'detail', id] as const,

  sales: (params?: unknown) => ['sales', params] as const,
  sale: (id: string) => ['sales', 'detail', id] as const,
  salePayments: (id: string) => ['sales', 'payments', id] as const,
  salesSummary: (params?: unknown) => ['sales', 'summary', params] as const,

  reportProfitability: (params?: unknown) => ['reports', 'profitability', params] as const,
  reportReceivable: (params?: unknown) => ['reports', 'receivable', params] as const,
  reportSalesMonthly: (params?: unknown) => ['reports', 'sales-monthly', params] as const,
  reportSalesBySalesperson: (params?: unknown) => ['reports', 'sales-by-salesperson', params] as const,
  reportReturnsMonthly: (params?: unknown) => ['reports', 'returns-monthly', params] as const,
  reportExpensesMonthly: (params?: unknown) => ['reports', 'expenses-monthly', params] as const,
  reportInventory: ['reports', 'inventory'] as const,
  reportFiscal: (params?: unknown) => ['reports', 'fiscal', params] as const,

  invoices: (params?: unknown) => ['invoices', params] as const,
  invoice: (id: string) => ['invoices', 'detail', id] as const,
  invoiceBySale: (saleId: string) => ['invoices', 'by-sale', saleId] as const,

  users: (params?: unknown) => ['users', params] as const,
  user: (id: string) => ['users', 'detail', id] as const,
  roles: ['users', 'roles'] as const,

  sessions: ['auth', 'sessions'] as const,
};
