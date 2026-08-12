import type { PageQuery } from '@/lib/api-types';

export interface Supplier {
  readonly id: string;
  readonly name: string;
  readonly contactName: string | null;
  readonly documentNumber: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly country: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface SupplierListParams extends PageQuery {
  search?: string;
  country?: string;
  isActive?: boolean;
}
