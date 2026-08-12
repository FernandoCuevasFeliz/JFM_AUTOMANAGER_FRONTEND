import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/use-auth';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { QUOTATION_STATUS_META } from '@/lib/status';
import { type AssignableQuotationStatus, quotationsApi } from './api';
import type { CreateQuotationValues, UpdateQuotationValues } from './schemas';
import type { QuotationListParams } from './types';

export function useQuotations(params: QuotationListParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.quotations(params),
    queryFn: () => quotationsApi.list(params),
    enabled: can('quotations:read'),
    placeholderData: (previous) => previous,
  });
}

export function useQuotation(id: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.quotation(id ?? ''),
    queryFn: () => quotationsApi.getById(id as string),
    enabled: Boolean(id) && can('quotations:read'),
  });
}

function useInvalidateQuotations() {
  const queryClient = useQueryClient();

  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['quotations'] });
    if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.quotation(id) });
  };
}

export function useCreateQuotation() {
  const invalidate = useInvalidateQuotations();

  return useMutation({
    mutationFn: (input: CreateQuotationValues) => quotationsApi.create(input),
    onSuccess: (quotation) => {
      toast.success('Cotizacion creada', { description: quotation.quotationNumber });
      invalidate(quotation.id);
    },
  });
}

export function useUpdateQuotation(id: string) {
  const invalidate = useInvalidateQuotations();

  return useMutation({
    mutationFn: (input: UpdateQuotationValues) => quotationsApi.update(id, input),
    onSuccess: () => {
      toast.success('Cotizacion actualizada');
      invalidate(id);
    },
  });
}

export function useChangeQuotationStatus(id: string) {
  const invalidate = useInvalidateQuotations();

  return useMutation({
    mutationFn: (status: AssignableQuotationStatus) => quotationsApi.changeStatus(id, status),
    onSuccess: (quotation) => {
      toast.success(`Cotizacion ${QUOTATION_STATUS_META[quotation.status].label.toLowerCase()}`);
      invalidate(id);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo cambiar el estado' }),
  });
}

export function useDeleteQuotation() {
  const invalidate = useInvalidateQuotations();

  return useMutation({
    mutationFn: (id: string) => quotationsApi.remove(id),
    onSuccess: () => {
      toast.success('Cotizacion eliminada');
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo eliminar la cotizacion' }),
  });
}

/** Mantenimiento manual del vencimiento; tambien se respeta en tiempo real. */
export function useExpireOverdueQuotations() {
  const invalidate = useInvalidateQuotations();

  return useMutation({
    mutationFn: () => quotationsApi.expireOverdue(),
    onSuccess: (result) => {
      toast.success(
        result.expired === 0
          ? 'No habia cotizaciones vencidas'
          : `${result.expired} cotizacion(es) marcadas como vencidas`,
      );
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo ejecutar el vencimiento' }),
  });
}
