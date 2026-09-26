import type { ColumnDef } from '@tanstack/react-table';
import { KeyRound, MoreHorizontal, Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { FilterBar, FilterSelect, SearchInput } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { EmptyState, NoResultsState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/use-auth';
import { formatDateTime } from '@/lib/dates';
import { useListParams } from '@/lib/use-list-params';
import { ResetPasswordDialog } from '../components/reset-password-dialog';
import { UserFormDialog } from '../components/user-form-dialog';
import { useDeleteUser, useRoles, useUsers } from '../hooks';
import { type User, userFullName } from '../types';

interface UserFilters {
  search: string;
  roleId: string | undefined;
  isActive: boolean | undefined;
}

const INITIAL_FILTERS: UserFilters = { search: '', roleId: undefined, isActive: undefined };

export function UsersListPage() {
  const navigate = useNavigate();
  const { can, user: currentUser } = useAuth();
  const { filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<UserFilters>(INITIAL_FILTERS);

  const usersQuery = useUsers(query);
  const rolesQuery = useRoles();
  const deleteUser = useDeleteUser();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<User | undefined>();
  const [passwordTarget, setPasswordTarget] = React.useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<User | null>(null);

  const canWrite = can('users:write');
  const canDelete = can('users:delete');
  const roles = rolesQuery.data ?? [];

  const columns = React.useMemo<ColumnDef<User, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Usuario',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">
              {userFullName(row.original)}
              {row.original.id === currentUser?.id && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(tu)</span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        ),
      },
      {
        id: 'roleName',
        header: 'Rol',
        cell: ({ row }) => (
          <Badge variant="blue" className="capitalize">
            {row.original.roleName}
          </Badge>
        ),
      },
      {
        id: 'phone',
        header: 'Telefono',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.phone ?? '—'}</span>
        ),
      },
      {
        id: 'lastLoginAt',
        header: 'Ultimo acceso',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDateTime(row.original.lastLoginAt)}</span>
        ),
      },
      {
        id: 'isActive',
        header: 'Estado',
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge variant="green">Activo</Badge>
          ) : (
            <Badge variant="neutral">Inactivo</Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const user = row.original;
          // El backend impide que un usuario se borre a si mismo (§7).
          const deletable = canDelete && user.id !== currentUser?.id;

          if (!canWrite && !deletable) return null;

          return (
            <div
              className="flex justify-end"
              // La fila entera navega al detalle: sin esto, abrir el menu
              // de acciones dispararia tambien la navegacion.
              onClick={(event) => event.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canWrite && (
                    <>
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditing(user);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setPasswordTarget(user)}>
                        <KeyRound />
                        Restablecer contrasena
                      </DropdownMenuItem>
                    </>
                  )}
                  {deletable && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setDeleteTarget(user)}>
                        <Trash2 />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [canWrite, canDelete, currentUser?.id],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        description="Cuentas del sistema y el rol con el que operan."
        actions={
          canWrite && (
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus />
              Nuevo usuario
            </Button>
          )
        }
      />

      <FilterBar showClear={hasActiveFilters} onClear={resetFilters}>
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Nombre, apellido o correo…"
        />

        <FilterSelect
          value={filters.roleId}
          onChange={(value) => setFilter('roleId', value)}
          placeholder="Rol"
          allLabel="Todos los roles"
          options={roles.map((role) => ({ value: role.id, label: role.name }))}
        />

        <FilterSelect
          value={filters.isActive === undefined ? undefined : String(filters.isActive)}
          onChange={(value) => setFilter('isActive', value === undefined ? undefined : value === 'true')}
          placeholder="Estado"
          allLabel="Activos e inactivos"
          className="sm:w-44"
          options={[
            { value: 'true', label: 'Solo activos' },
            { value: 'false', label: 'Solo inactivos' },
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={usersQuery.data?.data ?? []}
        meta={usersQuery.data?.meta}
        isLoading={usersQuery.isLoading}
        isFetching={usersQuery.isFetching}
        isError={usersQuery.isError}
        error={usersQuery.error}
        onRetry={() => void usersQuery.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={(row) => navigate(`/users/${row.id}`)}
        resourceLabel="usuarios"
        emptyState={
          hasActiveFilters ? (
            <NoResultsState onClear={resetFilters} />
          ) : (
            <EmptyState icon={UserCog} title="Sin usuarios" description="Crea el primer usuario." />
          )
        }
      />

      <UserFormDialog user={editing} open={formOpen} onOpenChange={setFormOpen} />

      <ResetPasswordDialog
        user={passwordTarget}
        open={passwordTarget !== null}
        onOpenChange={(open) => !open && setPasswordTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar usuario"
        description={
          <>
            Se eliminara <strong>{deleteTarget ? userFullName(deleteTarget) : ''}</strong>. El
            borrado es logico: la cuenta deja de aparecer pero su historial se conserva.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        loading={deleteUser.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteUser.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
