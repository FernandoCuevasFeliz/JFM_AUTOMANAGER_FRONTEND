import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/use-auth';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { suppliersApi } from './api';
import type { SupplierFormValues } from './schemas';
import type { SupplierListParams } from './types';

export function useSuppliers(params: SupplierListParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.suppliers(params),
    queryFn: () => suppliersApi.list(params),
    enabled: can('suppliers:read'),
    placeholderData: (previous) => previous,
  });
}

function useInvalidateSuppliers() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
}

export function useCreateSupplier() {
  const invalidate = useInvalidateSuppliers();

  return useMutation({
    mutationFn: (input: SupplierFormValues) => suppliersApi.create(input),
    onSuccess: () => {
      toast.success('Proveedor registrado');
      invalidate();
    },
  });
}

export function useUpdateSupplier(id: string) {
  const invalidate = useInvalidateSuppliers();

  return useMutation({
    mutationFn: (input: Partial<SupplierFormValues>) => suppliersApi.update(id, input),
    onSuccess: () => {
      toast.success('Proveedor actualizado');
      invalidate();
    },
  });
}

export function useDeleteSupplier() {
  const invalidate = useInvalidateSuppliers();

  return useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id),
    onSuccess: () => {
      toast.success('Proveedor eliminado');
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo eliminar el proveedor' }),
  });
}
