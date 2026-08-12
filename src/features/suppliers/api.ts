import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type { SupplierFormValues } from './schemas';
import type { Supplier, SupplierListParams } from './types';

export const suppliersApi = {
  list(params: SupplierListParams) {
    return api.list<Supplier>('/suppliers', params as QueryParams);
  },

  getById(id: string) {
    return api.get<Supplier>(`/suppliers/${id}`);
  },

  create(input: SupplierFormValues) {
    return api.post<Supplier>('/suppliers', input);
  },

  update(id: string, input: Partial<SupplierFormValues>) {
    return api.patch<Supplier>(`/suppliers/${id}`, input);
  },

  /** Se bloquea si el proveedor tiene compras registradas (§7). */
  remove(id: string) {
    return api.delete(`/suppliers/${id}`);
  },
};
