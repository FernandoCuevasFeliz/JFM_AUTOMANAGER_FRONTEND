import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/use-auth';
import { isApiError } from '@/lib/errors';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { invoicesApi } from './api';
import type { CreditNoteValues, IssueValues, NewInvoiceValues, RejectValues } from './schemas';
import type { InvoiceListParams } from './types';

export function useInvoices(params: InvoiceListParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.invoices(params),
    queryFn: () => invoicesApi.list(params),
    enabled: can('invoices:read'),
    placeholderData: (previous) => previous,
  });
}

export function useInvoice(id: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.invoice(id ?? ''),
    queryFn: () => invoicesApi.getById(id as string),
    enabled: Boolean(id) && can('invoices:read'),
  });
}

/**
 * Comprobante de una venta, o `null` si todavia no tiene.
 *
 * El 404 es una respuesta esperada aqui —la mayoria de las ventas no estan
 * facturadas— asi que se traduce a `null` en vez de dejar la query en error:
 * la ficha de la venta necesita distinguir "no tiene factura" de "fallo la
 * peticion".
 */
export function useInvoiceBySale(saleId: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.invoiceBySale(saleId ?? ''),
    queryFn: async () => {
      try {
        return await invoicesApi.getBySale(saleId as string);
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(saleId) && can('invoices:read'),
  });
}

/**
 * Una factura arrastra el estado de su venta (una venta facturada ya no se
 * puede cancelar), asi que al escribir se invalidan las dos.
 *
 * Aqui **solo se invalida, nunca se ceba la cache** con la respuesta de la
 * mutacion. No todos los endpoints devuelven la misma forma: `POST /invoices`
 * devuelve la entidad pelada y `POST .../credit-notes` devuelve la nota. Meter
 * eso en la clave del detalle dejaba una "factura" sin `creditNotes`, y la
 * pantalla reventaba al leerlas. Invalidar cuesta una peticion mas y no puede
 * mentir.
 */
function useInvalidateInvoices() {
  const queryClient = useQueryClient();

  return (invoice?: { id: string; saleId?: string }) => {
    void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    void queryClient.invalidateQueries({ queryKey: ['sales'] });

    if (invoice) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoice(invoice.id) });
      if (invoice.saleId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.invoiceBySale(invoice.saleId) });
      }
    }
  };
}

/**
 * Crea el comprobante de una venta.
 *
 * La respuesta es un `InvoiceRecord`: trae `id` y `saleId` —bastante para
 * invalidar y para navegar— pero no `saleNumber` ni las notas, asi que el aviso
 * no puede citar el numero de la venta.
 */
export function useCreateInvoice() {
  const invalidate = useInvalidateInvoices();

  return useMutation({
    mutationFn: (input: NewInvoiceValues) => invoicesApi.create(input),
    onSuccess: (record) => {
      toast.success('Comprobante creado', {
        description: 'Queda pendiente de envio a la DGII.',
      });
      invalidate(record);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo crear el comprobante' }),
  });
}

export function useIssueInvoice(id: string) {
  const invalidate = useInvalidateInvoices();

  return useMutation({
    mutationFn: (input: IssueValues) => invoicesApi.issue(id, input),
    onSuccess: (invoice) => {
      toast.success('Comprobante emitido', {
        description: `NCF ${invoice.ncfNumber}. A partir de ahora es inmutable.`,
      });
      invalidate(invoice);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo emitir el comprobante' }),
  });
}

export function useRejectInvoice(id: string) {
  const invalidate = useInvalidateInvoices();

  return useMutation({
    mutationFn: (input: RejectValues) => invoicesApi.reject(id, input),
    onSuccess: (invoice) => {
      toast.success('Rechazo registrado', { description: 'Corrigelo y reintenta el envio.' });
      invalidate(invoice);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo registrar el rechazo' }),
  });
}

export function useRetryInvoice(id: string) {
  const invalidate = useInvalidateInvoices();

  return useMutation({
    mutationFn: () => invoicesApi.retry(id),
    onSuccess: (invoice) => {
      toast.success('Comprobante devuelto a pendiente', {
        description: 'Ya se puede volver a enviar a la DGII.',
      });
      invalidate(invoice);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo reintentar' }),
  });
}

export function useCancelInvoice(id: string) {
  const invalidate = useInvalidateInvoices();

  return useMutation({
    mutationFn: () => invoicesApi.cancel(id),
    onSuccess: (invoice) => {
      toast.success('Comprobante anulado');
      invalidate(invoice);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo anular el comprobante' }),
  });
}

/**
 * Crea una nota de credito.
 *
 * Devuelve la **nota**, no la factura, asi que la invalidacion va con el
 * `invoiceId` que ya conocemos y no con el id de la respuesta.
 */
export function useCreateCreditNote(invoiceId: string) {
  const invalidate = useInvalidateInvoices();

  return useMutation({
    mutationFn: (input: CreditNoteValues) => invoicesApi.createCreditNote(invoiceId, input),
    onSuccess: () => {
      toast.success('Nota de credito creada', {
        description: 'Queda pendiente de aceptacion por la DGII.',
      });
      invalidate({ id: invoiceId });
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo crear la nota de credito' }),
  });
}

export function useIssueCreditNote(invoiceId: string) {
  const invalidate = useInvalidateInvoices();

  return useMutation({
    mutationFn: ({ creditNoteId, ...input }: IssueValues & { creditNoteId: string }) =>
      invoicesApi.issueCreditNote(invoiceId, creditNoteId, input),
    onSuccess: (invoice) => {
      // Si las notas cubren el importe completo, el backend anula la factura
      // en la misma operacion: conviene decirlo, porque cambia lo que se puede
      // hacer con la venta.
      toast.success('Nota de credito emitida', {
        description:
          invoice.status === 'cancelled'
            ? 'Cubre el importe completo: la factura queda anulada.'
            : `Acreditado ${invoice.creditedAmount} de ${invoice.salePrice}.`,
      });
      invalidate(invoice);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo emitir la nota' }),
  });
}

export function useRejectCreditNote(invoiceId: string) {
  const invalidate = useInvalidateInvoices();

  return useMutation({
    mutationFn: ({ creditNoteId, ...input }: RejectValues & { creditNoteId: string }) =>
      invoicesApi.rejectCreditNote(invoiceId, creditNoteId, input),
    onSuccess: (invoice) => {
      toast.success('Rechazo de la nota registrado');
      invalidate(invoice);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo registrar el rechazo' }),
  });
}
