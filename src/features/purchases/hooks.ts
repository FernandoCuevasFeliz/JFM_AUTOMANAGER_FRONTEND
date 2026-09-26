import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/use-auth';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { PURCHASE_STATUS_META, type PurchaseStatus } from '@/lib/status';
import { purchasesApi } from './api';
import type { CreatePurchaseValues, UpdatePurchaseValues } from './schemas';
import type { PurchaseListParams } from './types';

export function usePurchases(params: PurchaseListParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.purchases(params),
    queryFn: () => purchasesApi.list(params),
    enabled: can('purchases:read'),
    placeholderData: (previous) => previous,
  });
}

export function usePurchase(id: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.purchase(id ?? ''),
    queryFn: () => purchasesApi.getById(id as string),
    enabled: Boolean(id) && can('purchases:read'),
  });
}

function useInvalidatePurchases() {
  const queryClient = useQueryClient();

  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['purchases'] });
    // Recibir una compra cambia el estado de sus vehiculos.
    void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.purchase(id) });
  };
}

export function useCreatePurchase() {
  const invalidate = useInvalidatePurchases();

  return useMutation({
    mutationFn: (input: CreatePurchaseValues) => purchasesApi.create(input),
    onSuccess: (purchase) => {
      toast.success('Compra registrada', { description: purchase.purchaseNumber });
      invalidate(purchase.id);
    },
  });
}

export function useUpdatePurchase(id: string) {
  const invalidate = useInvalidatePurchases();

  return useMutation({
    mutationFn: (input: UpdatePurchaseValues) => purchasesApi.update(id, input),
    onSuccess: () => {
      toast.success('Compra actualizada');
      invalidate(id);
    },
  });
}

export function useChangePurchaseStatus(id: string) {
  const invalidate = useInvalidatePurchases();

  return useMutation({
    mutationFn: (status: PurchaseStatus) => purchasesApi.changeStatus(id, status),
    onSuccess: (purchase) => {
      toast.success(`Compra marcada como "${PURCHASE_STATUS_META[purchase.status].label}"`, {
        description:
          purchase.status === 'received'
            ? 'Los vehiculos en transito pasaron a inventario.'
            : undefined,
      });
      invalidate(id);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo cambiar el estado' }),
  });
}

export function useDeletePurchase() {
  const invalidate = useInvalidatePurchases();

  return useMutation({
    mutationFn: (id: string) => purchasesApi.remove(id),
    onSuccess: () => {
      toast.success('Compra eliminada');
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo eliminar la compra' }),
  });
}
