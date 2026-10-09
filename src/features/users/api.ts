import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type { CreateRoleValues, CreateUserValues, UpdateUserValues } from './schemas';
import type { ManagedSession, RevokeSessionsResult, Role, User, UserListParams } from './types';

export const usersApi = {
  list(params: UserListParams) {
    return api.list<User>('/users', params as QueryParams);
  },

  getById(id: string) {
    return api.get<User>(`/users/${id}`);
  },

  roles() {
    return api.get<Role[]>('/users/roles');
  },

  permissions() {
    return api.get<string[]>('/users/permissions');
  },

  createRole(input: CreateRoleValues) {
    return api.post<Role>('/users/roles', input);
  },

  updateRole(id: string, input: CreateRoleValues) {
    return api.patch<Role>(`/users/roles/${id}`, input);
  },

  deleteRole(id: string) {
    return api.delete(`/users/roles/${id}`);
  },

  sessions() {
    return api.get<ManagedSession[]>('/users/sessions');
  },

  revokeSession(sessionId: string) {
    return api.delete(`/users/sessions/${sessionId}`);
  },

  revokeUserSessions(userId: string) {
    return api.post<RevokeSessionsResult>(`/users/${userId}/logout-all`);
  },

  create(input: CreateUserValues) {
    return api.post<User>('/users', input);
  },

  update(id: string, input: UpdateUserValues) {
    return api.patch<User>(`/users/${id}`, input);
  },

  /** No pide la contrasena actual: es una accion de administracion. */
  resetPassword(id: string, newPassword: string) {
    return api.post<void>(`/users/${id}/reset-password`, { newPassword });
  },

  /** Se bloquea si es el propio usuario autenticado (§7). */
  remove(id: string) {
    return api.delete(`/users/${id}`);
  },
};
