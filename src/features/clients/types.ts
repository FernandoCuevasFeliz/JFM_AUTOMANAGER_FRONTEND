import type { PageQuery } from '@/lib/api-types';
import type { ClientType } from '@/lib/status';

export type { ClientType };

export interface Client {
  readonly id: string;
  readonly clientType: ClientType;
  readonly documentTypeId: string;
  readonly documentTypeName: string;
  readonly documentNumber: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly companyName: string | null;
  readonly email: string | null;
  readonly phone: string;
  readonly address: string | null;
  readonly city: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface ClientListParams extends PageQuery {
  search?: string;
  clientType?: ClientType;
  city?: string;
  isActive?: boolean;
}

/** Nombre a mostrar segun el tipo: persona o razon social. */
export function clientDisplayName(client: Client): string {
  if (client.clientType === 'company') {
    return client.companyName ?? '—';
  }
  return [client.firstName, client.lastName].filter(Boolean).join(' ') || '—';
}
