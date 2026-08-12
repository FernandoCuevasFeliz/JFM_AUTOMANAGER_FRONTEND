import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormField, FormRow, fieldAria } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { handleFormError } from '@/lib/errors';
import { diffPayload, isEmptyPayload } from '@/lib/zod-helpers';
import { useCreateUser, useRoles, useUpdateUser } from '../hooks';
import {
  USER_FORM_FIELDS,
  type UserFormValues,
  createUserSchema,
  updateUserSchema,
} from '../schemas';
import type { User } from '../types';

/** Alta y edicion de usuarios. La contrasena tiene su propia accion al editar. */
export function UserFormDialog({
  user,
  open,
  onOpenChange,
}: {
  user?: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(user);
  const rolesQuery = useRoles();
  const roles = rolesQuery.data ?? [];

  const createUser = useCreateUser();
  const updateUser = useUpdateUser(user?.id ?? '');

  const defaultValues = React.useMemo<UserFormValues>(
    () => ({
      roleId: user?.roleId ?? '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      password: '',
      phone: user?.phone ?? null,
      isActive: user?.isActive ?? true,
    }),
    [user],
  );

  const form = useForm<UserFormValues>({
    resolver: zodResolver(isEdit ? (updateUserSchema as never) : createUserSchema),
    defaultValues,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, defaultValues, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && user) {
        const payload = diffPayload(
          {
            roleId: user.roleId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            isActive: user.isActive,
          },
          {
            roleId: values.roleId,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            isActive: values.isActive,
          },
        );

        if (isEmptyPayload(payload)) {
          onOpenChange(false);
          return;
        }

        await updateUser.mutateAsync(payload);
      } else {
        await createUser.mutateAsync(values);
      }

      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: USER_FORM_FIELDS });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogDescription>
            El rol determina los permisos con los que el usuario entra al sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormRow columns={2}>
            <FormField label="Nombre" htmlFor="firstName" error={errors.firstName} required>
              <Input {...fieldAria('firstName', errors.firstName)} {...register('firstName')} />
            </FormField>

            <FormField label="Apellido" htmlFor="lastName" error={errors.lastName} required>
              <Input {...fieldAria('lastName', errors.lastName)} {...register('lastName')} />
            </FormField>
          </FormRow>

          <FormRow columns={2}>
            <FormField label="Correo electronico" htmlFor="email" error={errors.email} required>
              <Input
                {...fieldAria('email', errors.email)}
                type="email"
                autoComplete="off"
                {...register('email')}
              />
            </FormField>

            <FormField label="Telefono" htmlFor="phone" error={errors.phone}>
              <Input {...fieldAria('phone', errors.phone)} type="tel" {...register('phone')} />
            </FormField>
          </FormRow>

          <FormRow columns={2}>
            <FormField label="Rol" htmlFor="roleId" error={errors.roleId} required>
              <Controller
                control={control}
                name="roleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="roleId" aria-invalid={errors.roleId ? true : undefined}>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id} className="capitalize">
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {!isEdit && (
              <FormField
                label="Contrasena"
                htmlFor="password"
                error={errors.password}
                required
                hint="Minimo 8 caracteres, con al menos una letra y un numero."
              >
                <Input
                  {...fieldAria('password', errors.password)}
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                />
              </FormField>
            )}
          </FormRow>

          <FormField label="Activo" htmlFor="isActive">
            <div className="flex h-9 items-center gap-2.5">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <span className="text-sm text-muted-foreground">
                {watch('isActive') ? 'Puede iniciar sesion' : 'Bloqueado para iniciar sesion'}
              </span>
            </div>
          </FormField>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
