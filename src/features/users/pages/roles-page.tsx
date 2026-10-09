import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import * as React from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/features/auth/use-auth';
import { RoleFormDialog } from '../components/role-form-dialog';
import { useDeleteRole, useRoles } from '../hooks';
import type { Role } from '../types';

export function RolesPage() {
  const { can, user } = useAuth();
  const rolesQuery = useRoles();
  const deleteRole = useDeleteRole();
  const [open, setOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Role | null>(null);
  const roles = rolesQuery.data ?? [];
  const isAdmin = user?.roleName.toLowerCase() === 'admin';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles"
        description="Perfiles de acceso y capacidades asignables a los usuarios."
        actions={can('users:write') && <Button onClick={() => { setSelectedRole(null); setOpen(true); }}><Plus aria-hidden />Nuevo rol</Button>}
      />

      <Card>
        <CardContent className="px-0 pt-6">
          {rolesQuery.isLoading ? <TableSkeleton rows={4} columns={3} /> : rolesQuery.isError ? (
            <ErrorState error={rolesQuery.error} onRetry={() => void rolesQuery.refetch()} />
          ) : roles.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Sin roles" description="Crea el primer perfil de acceso." />
          ) : (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Rol</TableHead><TableHead>Descripcion</TableHead><TableHead>Permisos</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium capitalize">
                      {role.name}{role.id === user?.roleId && <Badge variant="secondary" className="ml-2">Tu rol</Badge>}
                    </TableCell>
                    <TableCell className="max-w-md text-muted-foreground">{role.description ?? '—'}</TableCell>
                    <TableCell><Badge variant="blue">{role.permissions.length} permisos</Badge></TableCell>
                    <TableCell className="text-right">
                      {can('users:write') && (role.id === user?.roleId ? (
                        <span className="text-xs text-muted-foreground" title="No puedes editar el rol asignado a tu propia cuenta">Protegido</span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedRole(role); setOpen(true); }}>
                            <Pencil aria-hidden />Editar
                          </Button>
                          {isAdmin && (
                            <Button size="icon-sm" variant="outline" aria-label={`Eliminar rol ${role.name}`} onClick={() => setDeleteTarget(role)}>
                              <Trash2 aria-hidden />
                            </Button>
                          )}
                        </div>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RoleFormDialog open={open} onOpenChange={setOpen} role={selectedRole} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}
        title="Eliminar rol"
        description={<>Se eliminara el rol <strong>{deleteTarget?.name}</strong>. Solo es posible si no esta asignado a ningun usuario.</>}
        confirmLabel="Eliminar"
        destructive
        loading={deleteRole.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteRole.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
