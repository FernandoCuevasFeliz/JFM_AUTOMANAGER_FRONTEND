import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/use-auth';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { usersApi } from './api';
import type { CreateRoleValues, CreateUserValues, UpdateUserValues } from './schemas';
import type { UserListParams } from './types';

export function useUsers(params: UserListParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.users(params),
    queryFn: () => usersApi.list(params),
    enabled: can('users:read'),
    placeholderData: (previous) => previous,
  });
}

export function useUser(id: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.user(id ?? ''),
    queryFn: () => usersApi.getById(id as string),
    enabled: Boolean(id) && can('users:read'),
  });
}

export function useRoles() {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: () => usersApi.roles(),
    enabled: can('users:read'),
    staleTime: 10 * 60_000,
  });
}

export function usePermissions() {
  const { can } = useAuth();
  return useQuery({
    queryKey: ['users', 'permissions'],
    queryFn: () => usersApi.permissions(),
    enabled: can('users:read'),
    staleTime: 10 * 60_000,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleValues) => usersApi.createRole(input),
    onSuccess: (role) => {
      toast.success(`Rol ${role.name} creado`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles });
    },
  });
}

export function useManagedSessions() {
  const { can } = useAuth();
  return useQuery({
    queryKey: ['users', 'sessions'],
    queryFn: () => usersApi.sessions(),
    enabled: can('users:read'),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => usersApi.revokeSession(sessionId),
    onSuccess: () => {
      toast.success('Sesion cerrada');
      void queryClient.invalidateQueries({ queryKey: ['users', 'sessions'] });
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo cerrar la sesion' }),
  });
}

export function useRevokeUserSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersApi.revokeUserSessions(userId),
    onSuccess: (result) => {
      toast.success(`${result.revoked} sesiones cerradas`);
      void queryClient.invalidateQueries({ queryKey: ['users', 'sessions'] });
    },
    onError: (error) => handleApiError(error, { title: 'No se pudieron cerrar las sesiones' }),
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['users'] });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (input: CreateUserValues) => usersApi.create(input),
    onSuccess: () => {
      toast.success('Usuario creado');
      invalidate();
    },
  });
}

export function useUpdateUser(id: string) {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (input: UpdateUserValues) => usersApi.update(id, input),
    onSuccess: () => {
      toast.success('Usuario actualizado');
      invalidate();
    },
  });
}

export function useResetUserPassword(id: string) {
  return useMutation({
    mutationFn: (newPassword: string) => usersApi.resetPassword(id, newPassword),
    onSuccess: () => {
      toast.success('Contrasena restablecida', {
        description: 'El usuario debera iniciar sesion con la nueva contrasena.',
      });
    },
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast.success('Usuario eliminado');
      invalidate();
    },
    // El backend impide borrarse a uno mismo.
    onError: (error) => handleApiError(error, { title: 'No se pudo eliminar el usuario' }),
  });
}
