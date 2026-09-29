import { Plus, ShieldCheck } from 'lucide-react';
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/features/auth/use-auth';
import { RoleFormDialog } from '../components/role-form-dialog';
import { useRoles } from '../hooks';

export function RolesPage() {
  const { can } = useAuth();
  const rolesQuery = useRoles();
  const [open, setOpen] = React.useState(false);
  const roles = rolesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles"
        description="Perfiles de acceso y capacidades asignables a los usuarios."
        actions={can('users:write') && <Button onClick={() => setOpen(true)}><Plus aria-hidden />Nuevo rol</Button>}
      />

      <Card>
        <CardContent className="px-0 pt-6">
          {rolesQuery.isLoading ? <TableSkeleton rows={4} columns={3} /> : rolesQuery.isError ? (
            <ErrorState error={rolesQuery.error} onRetry={() => void rolesQuery.refetch()} />
          ) : roles.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Sin roles" description="Crea el primer perfil de acceso." />
          ) : (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Rol</TableHead><TableHead>Descripcion</TableHead><TableHead>Permisos</TableHead></TableRow></TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium capitalize">{role.name}</TableCell>
                    <TableCell className="max-w-md text-muted-foreground">{role.description ?? '—'}</TableCell>
                    <TableCell><Badge variant="blue">{role.permissions.length} permisos</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RoleFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
