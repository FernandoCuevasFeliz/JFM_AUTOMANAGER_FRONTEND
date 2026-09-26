import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type { Client, ClientListParams } from './types';
import type { ClientFormValues } from './schemas';

export const clientsApi = {
  list(params: ClientListParams) {
    return api.list<Client>('/clients', params as QueryParams);
  },

  getById(id: string) {
    return api.get<Client>(`/clients/${id}`);
  },

  create(input: ClientFormValues) {
    return api.post<Client>('/clients', input);
  },

  update(id: string, input: Partial<ClientFormValues>) {
    return api.patch<Client>(`/clients/${id}`, input);
  },

  /** Se bloquea si el cliente tiene cotizaciones, reservas o ventas (§7). */
  remove(id: string) {
    return api.delete(`/clients/${id}`);
  },
};
