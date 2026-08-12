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
import { Switch } from '@/components/ui/switch';
import { handleFormError } from '@/lib/errors';
import { diffPayload, isEmptyPayload } from '@/lib/zod-helpers';
import { useCreateSupplier, useUpdateSupplier } from '../hooks';
import { SUPPLIER_FORM_FIELDS, type SupplierFormValues, supplierFormSchema } from '../schemas';
import type { Supplier } from '../types';

export function SupplierFormDialog({
  supplier,
  open,
  onOpenChange,
}: {
  supplier?: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(supplier);
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier(supplier?.id ?? '');

  const defaultValues = React.useMemo<SupplierFormValues>(
    () => ({
      name: supplier?.name ?? '',
      contactName: supplier?.contactName ?? null,
      documentNumber: supplier?.documentNumber ?? null,
      email: supplier?.email ?? null,
      phone: supplier?.phone ?? null,
      address: supplier?.address ?? null,
      country: supplier?.country ?? null,
      isActive: supplier?.isActive ?? true,
    }),
    [supplier],
  );

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
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
      if (isEdit && supplier) {
        const original: Partial<SupplierFormValues> = {
          name: supplier.name,
          contactName: supplier.contactName,
          documentNumber: supplier.documentNumber,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          country: supplier.country,
          isActive: supplier.isActive,
        };

        const payload = diffPayload(original, values);
        if (isEmptyPayload(payload)) {
          onOpenChange(false);
          return;
        }

        await updateSupplier.mutateAsync(payload);
      } else {
        await createSupplier.mutateAsync(values);
      }

      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: SUPPLIER_FORM_FIELDS });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
          <DialogDescription>
            Exportadores y suplidores a los que se les compran las unidades.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="Nombre" htmlFor="name" error={errors.name} required>
            <Input
              {...fieldAria('name', errors.name)}
              placeholder="Japan Auto Export KK"
              {...register('name')}
            />
          </FormField>

          <FormRow columns={2}>
            <FormField label="Persona de contacto" htmlFor="contactName" error={errors.contactName}>
              <Input {...fieldAria('contactName', errors.contactName)} {...register('contactName')} />
            </FormField>

            <FormField label="Documento / RNC" htmlFor="documentNumber" error={errors.documentNumber}>
              <Input {...fieldAria('documentNumber', errors.documentNumber)} {...register('documentNumber')} />
            </FormField>
          </FormRow>

          <FormRow columns={2}>
            <FormField label="Telefono" htmlFor="phone" error={errors.phone}>
              <Input {...fieldAria('phone', errors.phone)} type="tel" {...register('phone')} />
            </FormField>

            <FormField label="Correo electronico" htmlFor="email" error={errors.email}>
              <Input {...fieldAria('email', errors.email)} type="email" {...register('email')} />
            </FormField>
          </FormRow>

          <FormRow columns={2}>
            <FormField label="Pais" htmlFor="country" error={errors.country}>
              <Input {...fieldAria('country', errors.country)} placeholder="Japon" {...register('country')} />
            </FormField>

            <FormField label="Direccion" htmlFor="address" error={errors.address}>
              <Input {...fieldAria('address', errors.address)} {...register('address')} />
            </FormField>
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
                {watch('isActive') ? 'Disponible para comprar' : 'Oculto en los listados'}
              </span>
            </div>
          </FormField>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Guardar cambios' : 'Registrar proveedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
