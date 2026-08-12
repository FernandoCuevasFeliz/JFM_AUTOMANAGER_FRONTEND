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
import { Textarea } from '@/components/ui/textarea';
import { useCurrencies } from '@/features/catalogs/hooks';
import { ClientPicker } from '@/features/clients/components/client-picker';
import { VehiclePicker } from '@/features/vehicles/components/vehicle-picker';
import { addDaysCivil, todayCivil } from '@/lib/dates';
import { handleFormError } from '@/lib/errors';
import { QUOTABLE_VEHICLE_STATUSES } from '@/lib/status';
import { diffPayload, isEmptyPayload } from '@/lib/zod-helpers';
import { useCreateQuotation, useUpdateQuotation } from '../hooks';
import {
  QUOTATION_FORM_FIELDS,
  type CreateQuotationValues,
  createQuotationSchema,
  updateQuotationSchema,
} from '../schemas';
import type { Quotation } from '../types';

/**
 * Alta y edicion de cotizaciones.
 *
 * Se puede cotizar cualquier unidad **menos** una vendida: la empresa vende
 * incluso antes de que el vehiculo llegue al pais (§7 de API.md). Al editar, el
 * cliente y el vehiculo quedan fijos porque el backend no los acepta.
 */
export function QuotationFormDialog({
  quotation,
  open,
  onOpenChange,
}: {
  quotation?: Quotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(quotation);
  const currencies = useCurrencies();

  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation(quotation?.id ?? '');

  const defaultValues = React.useMemo<CreateQuotationValues>(
    () => ({
      clientId: quotation?.clientId ?? '',
      vehicleId: quotation?.vehicleId ?? '',
      currencyId: quotation?.currencyId ?? '',
      quotedPrice: quotation?.quotedPrice ?? ('' as unknown as number),
      // Por defecto, 30 dias de vigencia.
      validUntil: quotation?.validUntil ?? addDaysCivil(todayCivil(), 30),
      notes: quotation?.notes ?? null,
    }),
    [quotation],
  );

  const form = useForm<CreateQuotationValues>({
    resolver: zodResolver(isEdit ? (updateQuotationSchema as never) : createQuotationSchema),
    defaultValues,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, defaultValues, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && quotation) {
        const original = {
          currencyId: quotation.currencyId,
          quotedPrice: quotation.quotedPrice,
          validUntil: quotation.validUntil,
          notes: quotation.notes,
        };

        const next = {
          currencyId: values.currencyId,
          quotedPrice: values.quotedPrice,
          validUntil: values.validUntil,
          notes: values.notes,
        };

        const payload = diffPayload(original, next);
        if (isEmptyPayload(payload)) {
          onOpenChange(false);
          return;
        }

        await updateQuotation.mutateAsync(payload);
      } else {
        await createQuotation.mutateAsync(values);
      }

      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: QUOTATION_FORM_FIELDS });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cotizacion' : 'Nueva cotizacion'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Solo se pueden ajustar el precio, la moneda, la vigencia y las notas.'
              : 'El numero de cotizacion lo genera el sistema al guardar.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="Cliente" htmlFor="clientId" error={errors.clientId} required>
            {isEdit ? (
              <Input value={quotation?.clientName ?? ''} disabled />
            ) : (
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <ClientPicker
                    id="clientId"
                    value={field.value || null}
                    onChange={field.onChange}
                    invalid={Boolean(errors.clientId)}
                  />
                )}
              />
            )}
          </FormField>

          <FormField
            label="Vehiculo"
            htmlFor="vehicleId"
            error={errors.vehicleId}
            required
            hint={isEdit ? undefined : 'Se puede cotizar cualquier unidad que no este vendida.'}
          >
            {isEdit ? (
              <Input
                value={`${quotation?.vehicleBrandName} ${quotation?.vehicleModelName} · ${quotation?.vehicleChassisNumber}`}
                disabled
              />
            ) : (
              <Controller
                control={control}
                name="vehicleId"
                render={({ field }) => (
                  <VehiclePicker
                    id="vehicleId"
                    value={field.value || null}
                    onChange={field.onChange}
                    statuses={QUOTABLE_VEHICLE_STATUSES}
                    invalid={Boolean(errors.vehicleId)}
                  />
                )}
              />
            )}
          </FormField>

          <FormRow columns={3}>
            <FormField label="Moneda" htmlFor="currencyId" error={errors.currencyId} required>
              <Controller
                control={control}
                name="currencyId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="currencyId" aria-invalid={errors.currencyId ? true : undefined}>
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Precio cotizado" htmlFor="quotedPrice" error={errors.quotedPrice} required>
              <Input
                {...fieldAria('quotedPrice', errors.quotedPrice)}
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                {...register('quotedPrice')}
              />
            </FormField>

            <FormField label="Valida hasta" htmlFor="validUntil" error={errors.validUntil} required>
              <Input
                {...fieldAria('validUntil', errors.validUntil)}
                type="date"
                {...register('validUntil')}
              />
            </FormField>
          </FormRow>

          <FormField label="Notas" htmlFor="notes" error={errors.notes}>
            <Textarea {...fieldAria('notes', errors.notes)} rows={3} {...register('notes')} />
          </FormField>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Guardar cambios' : 'Crear cotizacion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
