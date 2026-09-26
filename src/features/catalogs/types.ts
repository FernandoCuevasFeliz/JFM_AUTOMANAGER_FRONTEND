import type { ExpenseScope } from '@/lib/status';

export type { ExpenseScope };

interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type DocumentType = CatalogEntry;
export type PaymentMethod = CatalogEntry;

export interface Currency extends CatalogEntry {
  readonly code: string;
  readonly symbol: string;
}

export interface ExpenseCategory extends CatalogEntry {
  /**
   * `vehicle` exige `vehicleId` en el gasto; `general` lo prohibe (§7).
   * Es lo que decide si el formulario de gastos muestra el selector de unidad.
   */
  readonly scope: ExpenseScope;
}

/** `GET /catalogs` devuelve las cuatro listas de golpe. */
export interface Catalogs {
  readonly documentTypes: DocumentType[];
  readonly currencies: Currency[];
  readonly paymentMethods: PaymentMethod[];
  readonly expenseCategories: ExpenseCategory[];
}

export interface CreateExpenseCategoryInput {
  readonly name: string;
  readonly scope: ExpenseScope;
}
