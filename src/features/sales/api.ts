import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type { CreateSaleValues, PaymentValues, UpdateSaleValues } from './schemas';
import type {
  RegisterPaymentResult,
  Sale,
  SaleAccount,
  SaleListParams,
  SalesSummary,
  SalesSummaryParams,
} from './types';

export const salesApi = {
  list(params: SaleListParams) {
    return api.list<Sale>('/sales', params as QueryParams);
  },

  getById(id: string) {
    return api.get<Sale>(`/sales/${id}`);
  },

  /** Requiere `reports:read`, no `sales:read`. */
  summary(params: SalesSummaryParams = {}) {
    return api.get<SalesSummary>('/sales/summary', params as QueryParams);
  },

  /**
   * La venta nace `in_process`. En la misma transaccion el vehiculo pasa a
   * `sold` y la reserva y la cotizacion quedan `converted`.
   */
  create(input: CreateSaleValues) {
    return api.post<Sale>('/sales', input);
  },

  update(id: string, input: UpdateSaleValues) {
    return api.patch<Sale>(`/sales/${id}`, input);
  },

  /** Exige saldo pendiente en cero. */
  complete(id: string) {
    return api.post<Sale>(`/sales/${id}/complete`);
  },

  /** Devuelve el vehiculo a inventario. */
  cancel(id: string) {
    return api.post<Sale>(`/sales/${id}/cancel`);
  },

  /** Archiva (borrado logico) una venta ya cancelada. */
  remove(id: string) {
    return api.delete(`/sales/${id}`);
  },

  listPayments(id: string) {
    return api.get<SaleAccount>(`/sales/${id}/payments`);
  },

  registerPayment(id: string, input: PaymentValues) {
    return api.post<RegisterPaymentResult>(`/sales/${id}/payments`, input);
  },
};
