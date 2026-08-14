import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type { CreditNoteValues, IssueValues, NewInvoiceValues, RejectValues } from './schemas';
import type { CreditNote, Invoice, InvoiceListParams, InvoiceRecord } from './types';

/**
 * Modulo de facturacion electronica (§5.12 de API.md).
 *
 * No hay `DELETE` en ningun endpoint: un comprobante fiscal no se borra. Todo
 * el ciclo de vida pasa por `status`.
 *
 * El backend **no habla con la DGII**: la firma y el envio los resuelve un PSFE
 * homologado y estos endpoints registran el resultado. Por eso `issue` recibe
 * el NCF en vez de generarlo.
 */
export const invoicesApi = {
  list(params: InvoiceListParams) {
    return api.list<Invoice>('/invoices', params as QueryParams);
  },

  getById(id: string) {
    return api.get<Invoice>(`/invoices/${id}`);
  },

  /** Devuelve 404 si la venta todavia no tiene comprobante. */
  getBySale(saleId: string) {
    return api.get<Invoice>(`/invoices/by-sale/${saleId}`);
  },

  /**
   * Nace `pending` y sin NCF. Una venta admite un solo comprobante.
   *
   * Devuelve `InvoiceRecord`, **no** `Invoice`: la entidad recien insertada, sin
   * los datos de la venta ni el array de notas. Quien lo llame tiene que releer
   * el comprobante para pintarlo.
   */
  create(input: NewInvoiceValues) {
    return api.post<InvoiceRecord>('/invoices', input);
  },

  /** Registra que la DGII acepto el comprobante y devolvio este NCF. */
  issue(id: string, input: IssueValues) {
    return api.post<Invoice>(`/invoices/${id}/issue`, input);
  },

  reject(id: string, input: RejectValues) {
    return api.post<Invoice>(`/invoices/${id}/reject`, input);
  },

  /** Devuelve un rechazo a `pending` para reintentar el envio. */
  retry(id: string) {
    return api.post<Invoice>(`/invoices/${id}/retry`);
  },

  /** Solo descarta comprobantes que la DGII todavia no acepto. */
  cancel(id: string) {
    return api.post<Invoice>(`/invoices/${id}/cancel`);
  },

  // --- Notas de credito -----------------------------------------------------

  /**
   * Devuelve la **nota**, no la factura.
   *
   * (API.md dice que los tres endpoints de notas devuelven la factura completa;
   * el codigo del backend muestra que ese solo es el caso al emitir y al
   * rechazar. Aqui manda el codigo.)
   */
  createCreditNote(invoiceId: string, input: CreditNoteValues) {
    return api.post<CreditNote>(`/invoices/${invoiceId}/credit-notes`, input);
  },

  issueCreditNote(invoiceId: string, creditNoteId: string, input: IssueValues) {
    return api.post<Invoice>(
      `/invoices/${invoiceId}/credit-notes/${creditNoteId}/issue`,
      input,
    );
  },

  rejectCreditNote(invoiceId: string, creditNoteId: string, input: RejectValues) {
    return api.post<Invoice>(
      `/invoices/${invoiceId}/credit-notes/${creditNoteId}/reject`,
      input,
    );
  },
};
