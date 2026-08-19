import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type {
  CreateSaleValues,
  PaymentValues,
  RefundValues,
  ReturnSaleItemValues,
  SaleItemValues,
  UpdateSaleItemValues,
  UpdateSaleValues,
} from './schemas';
import type {
  RegisterPaymentResult,
  RegisterRefundResult,
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
   * La venta nace `in_process`. En la misma transaccion **cada** vehiculo pasa a
   * `sold` y la reserva y la cotizacion quedan `converted`.
   */
  create(input: CreateSaleValues) {
    return api.post<Sale>('/sales', input);
  },

  /** Solo cabecera: el precio se corrige linea a linea. */
  update(id: string, input: UpdateSaleValues) {
    return api.patch<Sale>(`/sales/${id}`, input);
  },

  /** Exige saldo pendiente en cero. */
  complete(id: string) {
    return api.post<Sale>(`/sales/${id}/complete`);
  },

  /** Devuelve **todos** los vehiculos a inventario. */
  cancel(id: string) {
    return api.post<Sale>(`/sales/${id}/cancel`);
  },

  /** Archiva (borrado logico) una venta ya cancelada. */
  remove(id: string) {
    return api.delete(`/sales/${id}`);
  },

  // --- Vehiculos de la venta ------------------------------------------------
  // Los cuatro devuelven la venta completa: es lo que la pantalla repinta.

  addItem(saleId: string, input: SaleItemValues) {
    return api.post<Sale>(`/sales/${saleId}/items`, input);
  },

  updateItem(saleId: string, itemId: string, input: UpdateSaleItemValues) {
    return api.patch<Sale>(`/sales/${saleId}/items/${itemId}`, input);
  },

  /** Borra una linea que nunca debio existir. Nunca la ultima que quede. */
  removeItem(saleId: string, itemId: string) {
    return api.delete<Sale>(`/sales/${saleId}/items/${itemId}`);
  },

  /** Conserva la linea con su motivo y saca su importe del total vigente. */
  returnItem(saleId: string, itemId: string, input: ReturnSaleItemValues) {
    return api.post<Sale>(`/sales/${saleId}/items/${itemId}/return`, input);
  },

  // --- Cobros y reembolsos --------------------------------------------------

  listPayments(id: string) {
    return api.get<SaleAccount>(`/sales/${id}/payments`);
  },

  registerPayment(id: string, input: PaymentValues) {
    return api.post<RegisterPaymentResult>(`/sales/${id}/payments`, input);
  },

  /**
   * Devolver dinero no es un cobro negativo: los cobros solo aceptan importes
   * positivos, por diseño. El techo es lo cobrado menos lo ya reembolsado.
   */
  registerRefund(id: string, input: RefundValues) {
    return api.post<RegisterRefundResult>(`/sales/${id}/refunds`, input);
  },
};
