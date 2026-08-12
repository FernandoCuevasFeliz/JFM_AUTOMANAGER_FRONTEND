import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type { CreateQuotationValues, UpdateQuotationValues } from './schemas';
import type { Quotation, QuotationListParams, QuotationStatus } from './types';

/** `converted` no es asignable a mano: lo fija el sistema. */
export type AssignableQuotationStatus = Exclude<QuotationStatus, 'pending' | 'converted'>;

export const quotationsApi = {
  list(params: QuotationListParams) {
    return api.list<Quotation>('/quotations', params as QueryParams);
  },

  getById(id: string) {
    return api.get<Quotation>(`/quotations/${id}`);
  },

  create(input: CreateQuotationValues) {
    return api.post<Quotation>('/quotations', input);
  },

  /** Solo precio, moneda, vigencia y notas. */
  update(id: string, input: UpdateQuotationValues) {
    return api.patch<Quotation>(`/quotations/${id}`, input);
  },

  changeStatus(id: string, status: AssignableQuotationStatus) {
    return api.patch<Quotation>(`/quotations/${id}/status`, { status });
  },

  remove(id: string) {
    return api.delete(`/quotations/${id}`);
  },

  /** Mantenimiento: marca como vencidas las que pasaron de `validUntil`. */
  expireOverdue() {
    return api.post<{ expired: number }>('/quotations/expire-overdue');
  },
};
