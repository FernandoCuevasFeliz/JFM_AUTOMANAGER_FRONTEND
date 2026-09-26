import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/use-auth';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { expensesApi } from './api';
import type { ExpenseFormValues } from './schemas';
import type { ExpenseListParams } from './types';

export function useExpenses(params: ExpenseListParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.expenses(params),
    queryFn: () => expensesApi.list(params),
    enabled: can('expenses:read'),
    placeholderData: (previous) => previous,
  });
}

export function useExpense(id: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.expense(id ?? ''),
    queryFn: () => expensesApi.getById(id as string),
    enabled: Boolean(id) && can('expenses:read'),
  });
}

/** Costo consolidado de una unidad. Vive bajo `reports:read`. */
export function useVehicleCost(vehicleId: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.vehicleCost(vehicleId ?? ''),
    queryFn: () => expensesApi.vehicleCost(vehicleId as string),
    enabled: Boolean(vehicleId) && can('reports:read'),
  });
}

function useInvalidateExpenses() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };
}

export function useCreateExpense() {
  const invalidate = useInvalidateExpenses();

  return useMutation({
    mutationFn: (input: ExpenseFormValues) => expensesApi.create(input),
    onSuccess: () => {
      toast.success('Gasto registrado');
      invalidate();
    },
  });
}

export function useUpdateExpense(id: string) {
  const invalidate = useInvalidateExpenses();

  return useMutation({
    mutationFn: (input: Partial<ExpenseFormValues>) => expensesApi.update(id, input),
    onSuccess: () => {
      toast.success('Gasto actualizado');
      invalidate();
    },
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidateExpenses();

  return useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      toast.success('Gasto eliminado');
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo eliminar el gasto' }),
  });
}
