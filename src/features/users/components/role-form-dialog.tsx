import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import * as React from 'react';
import { FormField, fieldAria } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { handleFormError } from '@/lib/errors';
import { useCreateRole, usePermissions, useUpdateRole } from '../hooks';
import { ROLE_FORM_FIELDS, createRoleSchema, type CreateRoleValues } from '../schemas';
import type { Role } from '../types';

const RESOURCE_LABELS: Record<string, string> = {
  users: 'Usuarios y roles', catalogs: 'Catalogos', vehicles: 'Vehiculos', clients: 'Clientes',
  suppliers: 'Proveedores', purchases: 'Compras', expenses: 'Gastos', quotations: 'Cotizaciones',
  reservations: 'Reservas', sales: 'Ventas', payments: 'Pagos', audit: 'Auditoria', reports: 'Reportes',
};

const ACTION_LABELS: Record<string, string> = {
  read: 'Consultar', write: 'Crear y editar', delete: 'Eliminar', issue: 'Emitir',
  'change-status': 'Cambiar estado',
};

function groupPermissions(permissions: string[]) {
  const groups = new Map<string, string[]>();
  for (const permission of permissions) {
    const [resource] = permission.split(':');
    groups.set(resource, [...(groups.get(resource) ?? []), permission]);
  }
  return [...groups.entries()];
}

function isVisiblePermission(permission: string): boolean {
  if (permission.startsWith('audit:') || permission.startsWith('payments:')) return false;
  return true;
}

export function RoleFormDialog({ open, onOpenChange, role = null }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role | null;
}) {
  const permissionsQuery = usePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole(role?.id);
  const form = useForm<CreateRoleValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: '', description: null, permissions: [] },
  });

  const { register, control, handleSubmit, reset, setError, formState: { errors } } = form;
  const groups = groupPermissions((permissionsQuery.data ?? []).filter(isVisiblePermission));

  React.useEffect(() => {
    if (!open) return;
    reset(role
      ? { name: role.name, description: role.description, permissions: [...role.permissions] }
      : { name: '', description: null, permissions: [] });
  }, [open, reset, role]);

  const submit = handleSubmit(async (values) => {
    try {
      if (role) await updateRole.mutateAsync(values);
      else await createRole.mutateAsync(values);
      reset();
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: ROLE_FORM_FIELDS });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{role ? `Editar rol ${role.name}` : 'Nuevo rol'}</DialogTitle>
          <DialogDescription>
            {role ? 'Actualiza el perfil y los permisos que reciben sus usuarios.' : 'Define el acceso antes de asignar este rol a un usuario.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nombre" htmlFor="name" error={errors.name} required>
              <Input {...fieldAria('name', errors.name)} placeholder="supervisor_ventas" {...register('name')} />
            </FormField>
            <FormField label="Descripcion" htmlFor="description" error={errors.description}>
              <Textarea {...fieldAria('description', errors.description)} rows={2} {...register('description')} />
            </FormField>
          </div>

          <Controller
            name="permissions"
            control={control}
            render={({ field }) => (
              <FormField label="Permisos" error={errors.permissions} required>
                <div className="grid gap-x-6 gap-y-4 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groups.map(([resource, permissions]) => (
                    <fieldset key={resource} className="min-w-0">
                      <legend className="mb-2 text-sm font-semibold">{RESOURCE_LABELS[resource] ?? resource}</legend>
                      <div className="flex flex-col gap-2.5">
                        {permissions.map((permission) => {
                          const action = permission.split(':')[1] ?? permission;
                          const checked = field.value.includes(permission);
                          return (
                            <label key={permission} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted-foreground">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => field.onChange(
                                  value
                                    ? [...field.value, permission]
                                    : field.value.filter((item) => item !== permission),
                                )}
                              />
                              <span>{ACTION_LABELS[action] ?? action}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </FormField>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" loading={createRole.isPending || updateRole.isPending}>
              {role ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
