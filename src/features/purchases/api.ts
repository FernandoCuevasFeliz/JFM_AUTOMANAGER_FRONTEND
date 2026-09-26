import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type { PurchaseStatus } from '@/lib/status';
import type { CreatePurchaseValues, UpdatePurchaseValues } from './schemas';
import type { Purchase, PurchaseListParams } from './types';

export const purchasesApi = {
  list(params: PurchaseListParams) {
    return api.list<Purchase>('/purchases', params as QueryParams);
  },

  getById(id: string) {
    return api.get<Purchase>(`/purchases/${id}`);
  },

  /** Encabezado e items en una sola llamada (una transaccion en el backend). */
  create(input: CreatePurchaseValues) {
    return api.post<Purchase>('/purchases', input);
  },

  /** Solo el encabezado, y solo mientras la compra este abierta. */
  update(id: string, input: UpdatePurchaseValues) {
    return api.patch<Purchase>(`/purchases/${id}`, input);
  },

  /**
   * Marcar `received` ingresa la mercancia: los vehiculos de la compra que
   * sigan `in_transit` pasan a `in_inventory` en la misma transaccion.
   */
  changeStatus(id: string, status: PurchaseStatus) {
    return api.patch<Purchase>(`/purchases/${id}/status`, { status });
  },

  remove(id: string) {
    return api.delete(`/purchases/${id}`);
  },
};
