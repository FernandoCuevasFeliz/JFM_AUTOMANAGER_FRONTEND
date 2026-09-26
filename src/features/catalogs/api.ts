import { api } from '@/lib/api-client';
import type { Catalogs, CreateExpenseCategoryInput, ExpenseCategory } from './types';

export const catalogsApi = {
  /** Por defecto solo activos; `includeInactive` los trae todos. */
  getAll(includeInactive = false) {
    return api.get<Catalogs>('/catalogs', includeInactive ? { includeInactive: true } : undefined);
  },

  createExpenseCategory(input: CreateExpenseCategoryInput) {
    return api.post<ExpenseCategory>('/catalogs/expense-categories', input);
  },
};
