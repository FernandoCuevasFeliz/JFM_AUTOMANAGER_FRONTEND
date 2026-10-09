import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/use-auth';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { clientsApi } from './api';
import type { ClientFormValues } from './schemas';
import type { ClientListParams } from './types';

export function useClients(params: ClientListParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.clients(params),
    queryFn: () => clientsApi.list(params),
    enabled: can('clients:read'),
    placeholderData: (previous) => previous,
  });
}

export function useClient(id: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.client(id ?? ''),
    queryFn: () => clientsApi.getById(id as string),
    enabled: Boolean(id) && can('clients:read'),
  });
}

function useInvalidateClients() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['clients'] });
}

export function useCreateClient() {
  const invalidate = useInvalidateClients();

  return useMutation({
    mutationFn: (input: ClientFormValues) => clientsApi.create(input),
    onSuccess: () => {
      toast.success('Cliente registrado');
      invalidate();
    },
  });
}

export function useUpdateClient(id: string) {
  const invalidate = useInvalidateClients();

  return useMutation({
    mutationFn: (input: Partial<ClientFormValues>) => clientsApi.update(id, input),
    onSuccess: () => {
      toast.success('Cliente actualizado');
      invalidate();
    },
  });
}

export function useDeleteClient() {
  const invalidate = useInvalidateClients();

  return useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => {
      toast.success('Cliente deshabilitado');
      invalidate();
    },
    // Si tiene cotizaciones, reservas o ventas el backend responde 422 y el
    // mensaje sugiere desactivarlo en su lugar.
    onError: (error) => handleApiError(error, { title: 'No se pudo deshabilitar el cliente' }),
  });
}
