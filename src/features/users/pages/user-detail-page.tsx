import { KeyRound, Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DetailCard, DetailGrid, DetailItem } from '@/components/detail-view';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { formatDateTime } from '@/lib/dates';
import { userAccent } from '@/lib/user-accent';
import { ResetPasswordDialog } from '../components/reset-password-dialog';
import { UserFormDialog } from '../components/user-form-dialog';
import { useDeleteUser, useRoles, useUser } from '../hooks';
import { userFullName } from '../types';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, user: currentUser } = useAuth();

  const userQuery = useUser(id);
  const rolesQuery = useRoles();
  const deleteUser = useDeleteUser();

  const [editOpen, setEditOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  if (userQuery.isLoading) return <DetailSkeleton />;

  if (userQuery.isError || !userQuery.data) {
    return <ErrorState error={userQuery.error} onRetry={() => void userQuery.refetch()} />;
  }

  const user = userQuery.data;
  const accent = userAccent(user.id);
  const role = rolesQuery.data?.find((item) => item.id === user.roleId);
  // El backend rechaza que un usuario se borre a si mismo (§7 de API.md).
  const esUnoMismo = currentUser?.id === user.id;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Usuario"
        title={userFullName(user)}
        description={user.email}
        backTo="/users"
        backLabel="Usuarios"
        actions={
          <>
            {can('users:write') && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil />
                Editar
              </Button>
            )}
            {can('users:write') && (
              <Button variant="outline" onClick={() => setResetOpen(true)}>
                <KeyRound />
                Restablecer contrasena
              </Button>
            )}
            {can('users:delete') && !esUnoMismo && (
              <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Eliminar
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ backgroundColor: accent.color }}
          aria-hidden
        >
          {`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()}
        </span>
        <Badge variant="default">{user.roleName}</Badge>
        {user.isActive ? (
          <Badge variant="green">Activo</Badge>
        ) : (
          <Badge variant="neutral">Inactivo</Badge>
        )}
        {esUnoMismo && <span className="text-sm text-muted-foreground">Eres tu</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DetailCard title="Datos de la cuenta" className="lg:col-span-2">
          <DetailGrid>
            <DetailItem label="Nombre" value={user.firstName} />
            <DetailItem label="Apellido" value={user.lastName} />
            <DetailItem label="Correo">
              <a href={`mailto:${user.email}`} className="underline-offset-4 hover:underline">
                {user.email}
              </a>
            </DetailItem>
            <DetailItem label="Telefono" value={user.phone} numeric />
            <DetailItem label="Rol" value={user.roleName} />
            <DetailItem label="Estado" value={user.isActive ? 'Activo' : 'Inactivo'} />
            <DetailItem
              label="Ultimo acceso"
              value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Nunca ha entrado'}
              numeric={Boolean(user.lastLoginAt)}
            />
            <DetailItem label="Alta" value={formatDateTime(user.createdAt)} numeric />
          </DetailGrid>
        </DetailCard>

        <DetailCard title={`Permisos de ${user.roleName}`}>
          {!role ? (
            <p className="text-[13px] text-muted-foreground">
              No se pudieron cargar los permisos del rol.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {role.description && (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {role.description}
                </p>
              )}
              <ul className="flex flex-wrap gap-1.5">
                {role.permissions.map((permission) => (
                  <li key={permission}>
                    <Badge variant="outline" className="num lowercase tracking-normal">
                      {permission}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Los permisos vienen del rol y no se editan por usuario. Para cambiarlos, cambia el
                rol.
              </p>
            </div>
          )}
        </DetailCard>
      </div>

      <UserFormDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
      <ResetPasswordDialog user={user} open={resetOpen} onOpenChange={setResetOpen} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Eliminar a ${userFullName(user)}`}
        description="El usuario pierde el acceso al sistema. Su rastro en los documentos que registro se conserva."
        confirmLabel="Eliminar"
        destructive
        loading={deleteUser.isPending}
        onConfirm={() => {
          deleteUser.mutate(user.id, { onSuccess: () => navigate('/users') });
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}
