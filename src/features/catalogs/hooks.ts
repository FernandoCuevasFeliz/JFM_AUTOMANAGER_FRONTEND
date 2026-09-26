import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { useAuth } from '@/features/auth/use-auth';
import { catalogsApi } from './api';
import type { Catalogs, CreateExpenseCategoryInput, Currency, ExpenseCategory } from './types';

const EMPTY_CATALOGS: Catalogs = {
  documentTypes: [],
  currencies: [],
  paymentMethods: [],
  expenseCategories: [],
};

/**
 * Los catalogos se cargan **una vez** tras autenticar y se cachean: cambian por
 * despliegue, no por operacion (§4 de API.md). Ningun formulario los vuelve a
 * pedir.
 */
export function useCatalogs() {
  const { status, can } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.catalogs,
    queryFn: () => catalogsApi.getAll(),
    enabled: status === 'authenticated' && can('catalogs:read'),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  return {
    ...query,
    catalogs: query.data ?? EMPTY_CATALOGS,
  };
}

export function useCurrencies(): Currency[] {
  return useCatalogs().catalogs.currencies;
}

export function useDocumentTypes() {
  return useCatalogs().catalogs.documentTypes;
}

export function usePaymentMethods() {
  return useCatalogs().catalogs.paymentMethods;
}

export function useExpenseCategories(): ExpenseCategory[] {
  return useCatalogs().catalogs.expenseCategories;
}

/** Busca una moneda por id para saber si el documento va en pesos. */
export function useCurrency(currencyId: string | null | undefined): Currency | undefined {
  const currencies = useCurrencies();
  if (!currencyId) return undefined;
  return currencies.find((currency) => currency.id === currencyId);
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExpenseCategoryInput) => catalogsApi.createExpenseCategory(input),
    onSuccess: (category) => {
      toast.success(`Categoria "${category.name}" creada`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalogs });
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo crear la categoria' }),
  });
}
