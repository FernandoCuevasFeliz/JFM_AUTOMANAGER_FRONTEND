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
import { useDocumentTypes } from '@/features/catalogs/hooks';
import { CLIENT_TYPES, CLIENT_TYPE_META } from '@/lib/status';
import { handleFormError } from '@/lib/errors';
import { diffPayload, isEmptyPayload } from '@/lib/zod-helpers';
import { useCreateClient, useUpdateClient } from '../hooks';
import { CLIENT_FORM_FIELDS, type ClientFormValues, clientFormSchema } from '../schemas';
import type { Client } from '../types';

/**
 * Alta y edicion de clientes.
 *
 * Los campos de identidad cambian con `clientType`: una persona pide nombre y
 * apellido, una empresa pide razon social (§7 de API.md). Al alternar el tipo
 * se limpian los campos del otro para no enviar datos contradictorios.
 */
export function ClientFormDialog({
  client,
  open,
  onOpenChange,
}: {
  client?: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(client);
  const documentTypes = useDocumentTypes();

  const createClient = useCreateClient();
  const updateClient = useUpdateClient(client?.id ?? '');

  const defaultValues = React.useMemo<ClientFormValues>(
    () => ({
      clientType: client?.clientType ?? 'individual',
      documentTypeId: client?.documentTypeId ?? '',
      documentNumber: client?.documentNumber ?? '',
      firstName: client?.firstName ?? null,
      lastName: client?.lastName ?? null,
      companyName: client?.companyName ?? null,
      email: client?.email ?? null,
      phone: client?.phone ?? '',
      address: client?.address ?? null,
      city: client?.city ?? null,
      isActive: client?.isActive ?? true,
    }),
    [client],
  );

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, defaultValues, reset]);

  const clientType = watch('clientType');
  const isCompany = clientType === 'company';

  function handleTypeChange(next: string) {
    setValue('clientType', next as ClientFormValues['clientType']);
    // Los campos del otro tipo dejan de aplicar: se vacian a null.
    if (next === 'company') {
      setValue('firstName', null);
      setValue('lastName', null);
    } else {
      setValue('companyName', null);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && client) {
        const original: Partial<ClientFormValues> = {
          clientType: client.clientType,
          documentTypeId: client.documentTypeId,
          documentNumber: client.documentNumber,
          firstName: client.firstName,
          lastName: client.lastName,
          companyName: client.companyName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          isActive: client.isActive,
        };

        const payload = diffPayload(original, values);
        if (isEmptyPayload(payload)) {
          onOpenChange(false);
          return;
        }

        await updateClient.mutateAsync(payload);
      } else {
        await createClient.mutateAsync(values);
      }

      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: CLIENT_FORM_FIELDS });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>
            {isCompany
              ? 'Los datos de una empresa se identifican por su razon social.'
              : 'Los datos de una persona fisica se identifican por nombre y apellido.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormRow columns={2}>
            <FormField label="Tipo de cliente" htmlFor="clientType" error={errors.clientType} required>
              <Controller
                control={control}
                name="clientType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={handleTypeChange}>
                    <SelectTrigger id="clientType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {CLIENT_TYPE_META[type].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Tipo de documento" htmlFor="documentTypeId" error={errors.documentTypeId} required>
              <Controller
                control={control}
                name="documentTypeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="documentTypeId" aria-invalid={errors.documentTypeId ? true : undefined}>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </FormRow>

          <FormField label="Numero de documento" htmlFor="documentNumber" error={errors.documentNumber} required>
            <Input
              {...fieldAria('documentNumber', errors.documentNumber)}
              placeholder={isCompany ? '131-99999-1' : '402-1234567-8'}
              {...register('documentNumber')}
            />
          </FormField>

          {/* Identidad segun el tipo: la UI cambia con `clientType`. */}
          {isCompany ? (
            <FormField label="Razon social" htmlFor="companyName" error={errors.companyName} required>
              <Input
                {...fieldAria('companyName', errors.companyName)}
                placeholder="Transporte del Cibao SRL"
                {...register('companyName')}
              />
            </FormField>
          ) : (
            <FormRow columns={2}>
              <FormField label="Nombre" htmlFor="firstName" error={errors.firstName} required>
                <Input {...fieldAria('firstName', errors.firstName)} {...register('firstName')} />
              </FormField>
              <FormField label="Apellido" htmlFor="lastName" error={errors.lastName} required>
                <Input {...fieldAria('lastName', errors.lastName)} {...register('lastName')} />
              </FormField>
            </FormRow>
          )}

          <FormRow columns={2}>
            <FormField label="Telefono" htmlFor="phone" error={errors.phone} required>
              <Input
                {...fieldAria('phone', errors.phone)}
                type="tel"
                placeholder="809-555-0101"
                {...register('phone')}
              />
            </FormField>

            <FormField label="Correo electronico" htmlFor="email" error={errors.email}>
              <Input {...fieldAria('email', errors.email)} type="email" {...register('email')} />
            </FormField>
          </FormRow>

          <FormRow columns={2}>
            <FormField label="Ciudad" htmlFor="city" error={errors.city}>
              <Input {...fieldAria('city', errors.city)} placeholder="Santiago" {...register('city')} />
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
                {watch('isActive') ? 'Disponible para operar' : 'Oculto en los listados'}
              </span>
            </div>
          </FormField>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Guardar cambios' : 'Registrar cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
