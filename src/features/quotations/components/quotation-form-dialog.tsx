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
import { useVehicle } from '@/features/vehicles/hooks';
import { VehiclePicker } from '@/features/vehicles/components/vehicle-picker';
import { addDaysCivil, todayCivil } from '@/lib/dates';
import { handleFormError } from '@/lib/errors';
import { REPORTING_CURRENCY, formatMoney, formatPercentage, isReportingCurrency } from '@/lib/money';
import { QUOTABLE_VEHICLE_STATUSES } from '@/lib/status';
import { cn } from '@/lib/utils';
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
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, defaultValues, reset]);

  /*
   * Precio de lista de la unidad, como referencia.
   *
   * Son dos numeros distintos a proposito: el de lista es sugerido y puede
   * cambiar manana, mientras que el cotizado queda congelado en el documento
   * que se le entrego al cliente. Pero que sean campos separados no obliga a
   * que el vendedor se aprenda la cifra de memoria: se veia en el desplegable
   * al elegir la unidad y desaparecia al seleccionarla. El formulario de venta
   * ya acompanaba asi; este no.
   *
   * `vehicles.sale_price` va en la moneda de reporte y no tiene columna de
   * moneda. Y `quotations` —a diferencia de `sales`— no guarda tasa de cambio,
   * asi que aqui no hay con que convertir: cotizando en divisa, la lista se
   * ensena como dato en pesos y la conversion la hace una persona.
   */
  const currencyId = watch('currencyId');
  const currency = currencies.find((item) => item.id === currencyId);
  const isDop = isReportingCurrency(currency?.code);

  const vehicleId = watch('vehicleId');
  const selectedVehicle = useVehicle(vehicleId || undefined).data;
  const listPrice = selectedVehicle?.salePrice ?? null;

  const quotedPrice = Number(watch('quotedPrice'));
  const priceGap =
    isDop && listPrice !== null && Number.isFinite(quotedPrice) && quotedPrice > 0
      ? Math.round((quotedPrice - listPrice) * 100) / 100
      : null;

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

        /*
         * La vigencia solo se juzga si de verdad cambia, igual que hace
         * `update-quotation` en el servidor. Una cotizacion aprobada cuyo plazo
         * ya paso —porque el barrido de vencimientos aun no ha corrido— se tiene
         * que poder editar para subirle el precio sin obligar a tocar la fecha.
         */
        if (payload.validUntil !== undefined && payload.validUntil < todayCivil()) {
          setError('validUntil', {
            type: 'manual',
            message: 'La vigencia no puede ser anterior a hoy',
          });
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

            <FormField
              label="Precio cotizado"
              htmlFor="quotedPrice"
              error={errors.quotedPrice}
              required
              hint={
                listPrice !== null
                  ? `Precio de lista: ${formatMoney(listPrice, REPORTING_CURRENCY)}`
                  : undefined
              }
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <Input
                    {...fieldAria('quotedPrice', errors.quotedPrice)}
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    className="num"
                    {...register('quotedPrice')}
                  />
                  {/*
                    Solo en pesos: el precio de lista esta en la moneda de
                    reporte, y volcarlo tal cual en una cotizacion en dolares
                    pondria 1.200.000 dolares.
                  */}
                  {listPrice !== null && isDop && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setValue('quotedPrice', listPrice, { shouldValidate: true })}
                    >
                      Usar lista
                    </Button>
                  )}
                </div>

                {/* La desviacion se muestra, no se bloquea: rebajar es normal. */}
                {priceGap !== null && Math.abs(priceGap) >= 0.01 && listPrice !== null && (
                  <p
                    className={cn(
                      'text-xs leading-relaxed',
                      priceGap < 0 ? 'text-warning' : 'text-success',
                    )}
                  >
                    {priceGap < 0 ? 'Por debajo de lista: ' : 'Por encima de lista: '}
                    <span className="num font-medium">
                      {formatMoney(Math.abs(priceGap), REPORTING_CURRENCY)}
                    </span>
                    {listPrice > 0 && <> ({formatPercentage(Math.abs((priceGap / listPrice) * 100))})</>}
                  </p>
                )}

                {listPrice !== null && !isDop && currency && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    La lista esta en {REPORTING_CURRENCY} y cotizas en {currency.code}: la
                    conversion no la hace el sistema, porque una cotizacion no guarda tasa de
                    cambio.
                  </p>
                )}
              </div>
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
