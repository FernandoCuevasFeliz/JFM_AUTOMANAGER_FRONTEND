import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/use-auth';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { salesApi } from './api';
import type { CreateSaleValues, PaymentValues, UpdateSaleValues } from './schemas';
import type { SaleListParams, SalesSummaryParams } from './types';

export function useSales(params: SaleListParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.sales(params),
    queryFn: () => salesApi.list(params),
    enabled: can('sales:read'),
    placeholderData: (previous) => previous,
  });
}

export function useSale(id: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.sale(id ?? ''),
    queryFn: () => salesApi.getById(id as string),
    enabled: Boolean(id) && can('sales:read'),
  });
}

export function useSalesSummary(params: SalesSummaryParams = {}) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.salesSummary(params),
    queryFn: () => salesApi.summary(params),
    enabled: can('reports:read'),
  });
}

export function useSalePayments(id: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.salePayments(id ?? ''),
    queryFn: () => salesApi.listPayments(id as string),
    enabled: Boolean(id) && can('payments:read'),
  });
}

/**
 * Una venta arrastra el estado del vehiculo, de la reserva y de la cotizacion,
 * asi que al escribir se invalidan los cuatro recursos.
 */
function useInvalidateSales() {
  const queryClient = useQueryClient();

  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
    void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    void queryClient.invalidateQueries({ queryKey: ['quotations'] });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sale(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.salePayments(id) });
    }
  };
}

export function useCreateSale() {
  const invalidate = useInvalidateSales();

  return useMutation({
    mutationFn: (input: CreateSaleValues) => salesApi.create(input),
    onSuccess: (sale) => {
      toast.success('Venta registrada', {
        description: `${sale.saleNumber} · el vehiculo paso a vendido.`,
      });
      invalidate(sale.id);
    },
  });
}

export function useUpdateSale(id: string) {
  const invalidate = useInvalidateSales();

  return useMutation({
    mutationFn: (input: UpdateSaleValues) => salesApi.update(id, input),
    onSuccess: () => {
      toast.success('Venta actualizada');
      invalidate(id);
    },
  });
}

/** El backend exige saldo cero; la UI solo habilita el boton si `fullyPaid`. */
export function useCompleteSale(id: string) {
  const invalidate = useInvalidateSales();

  return useMutation({
    mutationFn: () => salesApi.complete(id),
    onSuccess: () => {
      toast.success('Venta completada', { description: 'La unidad queda entregada.' });
      invalidate(id);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo completar la venta' }),
  });
}

export function useCancelSale(id: string) {
  const invalidate = useInvalidateSales();

  return useMutation({
    mutationFn: () => salesApi.cancel(id),
    onSuccess: () => {
      toast.success('Venta cancelada', { description: 'El vehiculo volvio a inventario.' });
      invalidate(id);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo cancelar la venta' }),
  });
}

export function useDeleteSale() {
  const invalidate = useInvalidateSales();

  return useMutation({
    mutationFn: (id: string) => salesApi.remove(id),
    onSuccess: () => {
      toast.success('Venta archivada');
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo archivar la venta' }),
  });
}

export function useRegisterPayment(id: string) {
  const invalidate = useInvalidateSales();

  return useMutation({
    mutationFn: (input: PaymentValues) => salesApi.registerPayment(id, input),
    onSuccess: (result) => {
      // Registrar el ultimo abono no cierra la venta: saldar y entregar son dos
      // momentos distintos del negocio (§5.11 de API.md).
      toast.success('Cobro registrado', {
        description: result.fullyPaid
          ? 'La venta quedo saldada: ya se puede completar.'
          : `Saldo pendiente: ${result.pendingBalance.toFixed(2)}`,
      });
      invalidate(id);
    },
  });
}
