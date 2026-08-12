import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type { ExpenseFormValues } from './schemas';
import type { Expense, ExpenseListParams, VehicleCostSummary } from './types';

export const expensesApi = {
  list(params: ExpenseListParams) {
    return api.list<Expense>('/expenses', params as QueryParams);
  },

  getById(id: string) {
    return api.get<Expense>(`/expenses/${id}`);
  },

  create(input: ExpenseFormValues) {
    return api.post<Expense>('/expenses', input);
  },

  update(id: string, input: Partial<ExpenseFormValues>) {
    return api.patch<Expense>(`/expenses/${id}`, input);
  },

  remove(id: string) {
    return api.delete(`/expenses/${id}`);
  },

  /** Requiere `reports:read`, no `expenses:read`. */
  vehicleCost(vehicleId: string) {
    return api.get<VehicleCostSummary>(`/expenses/vehicle-cost/${vehicleId}`);
  },
};
