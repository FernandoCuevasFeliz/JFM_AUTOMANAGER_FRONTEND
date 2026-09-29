import type { PageQuery } from '@/lib/api-types';

export interface User {
  readonly id: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly isActive: boolean;
  readonly lastLoginAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

/** `GET /users/roles` devuelve cada rol con su lista de permisos. */
export interface Role {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly permissions: string[];
}

export interface ManagedSession {
  readonly id: string;
  readonly userId: string;
  readonly userName: string;
  readonly userEmail: string;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface RevokeSessionsResult {
  readonly revoked: number;
}

export interface UserListParams extends PageQuery {
  search?: string;
  roleId?: string;
  isActive?: boolean;
}

export function userFullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim();
}
