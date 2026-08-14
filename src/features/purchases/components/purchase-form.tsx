import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { FormField, FormRow, FormSection, fieldAria } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useSuppliers } from '@/features/suppliers/hooks';
import { VehiclePicker } from '@/features/vehicles/components/vehicle-picker';
import { todayCivil } from '@/lib/dates';
import { handleFormError } from '@/lib/errors';
import { REPORTING_CURRENCY, formatMoney, isReportingCurrency } from '@/lib/money';
import { PURCHASE_STATUS_META } from '@/lib/status';
import { diffPayload, isEmptyPayload } from '@/lib/zod-helpers';
import { useCreatePurchase, useUpdatePurchase } from '../hooks';
import {
  PURCHASE_FORM_FIELDS,
  type CreatePurchaseValues,
  createPurchaseSchema,
  updatePurchaseSchema,
} from '../schemas';
import type { Purchase } from '../types';

const EMPTY_ITEM = {
  vehicleId: '',
  unitCost: 0,
  freightCost: 0,
  insuranceCost: 0,
  otherCosts: 0,
};

/**
 * Alta de compras (encabezado + items) y edicion del encabezado.
 *
 * Al editar, los items no se tocan: `PATCH /purchases/:id` solo acepta el
 * encabezado y unicamente mientras la compra sigue abierta (§5.7 de API.md).
 * El estado tampoco: tiene su propio endpoint.
 */
export function PurchaseForm({ purchase }: { purchase?: Purchase }) {
  const navigate = useNavigate();
  const isEdit = Boolean(purchase);

  const currencies = useCurrencies();
  const suppliersQuery = useSuppliers({ page: 1, pageSize: 100, isActive: true });
  const suppliers = suppliersQuery.data?.data ?? [];

  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase(purchase?.id ?? '');

  const defaultValues = React.useMemo<CreatePurchaseValues>(
    () => ({
      supplierId: purchase?.supplierId ?? '',
      currencyId: purchase?.currencyId ?? '',
      purchaseNumber: undefined,
      invoiceNumber: purchase?.invoiceNumber ?? null,
      purchaseDate: purchase?.purchaseDate ?? todayCivil(),
      exchangeRate: purchase?.exchangeRate ?? 1,
      status: purchase?.status ?? 'pending',
      notes: purchase?.notes ?? null,
      items: purchase
        ? purchase.items.map((item) => ({
            vehicleId: item.vehicleId,
            unitCost: item.unitCost,
            freightCost: item.freightCost,
            insuranceCost: item.insuranceCost,
            otherCosts: item.otherCosts,
          }))
        : [{ ...EMPTY_ITEM }],
    }),
    [purchase],
  );

  const form = useForm<CreatePurchaseValues>({
    resolver: zodResolver(isEdit ? (updatePurchaseSchema as never) : createPurchaseSchema),
    defaultValues,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const currencyId = watch('currencyId');
  const currency = currencies.find((item) => item.id === currencyId);
  const isDop = isReportingCurrency(currency?.code);

  // Una compra en pesos lleva tasa 1 (§7 de API.md).
  React.useEffect(() => {
    if (isDop) setValue('exchangeRate', 1);
  }, [isDop, setValue]);

  const items = watch('items');
  const total = React.useMemo(
    () =>
      (items ?? []).reduce((sum, item) => {
        const values = [item.unitCost, item.freightCost, item.insuranceCost, item.otherCosts];
        return sum + values.reduce((acc: number, value) => acc + (Number(value) || 0), 0);
      }, 0),
    [items],
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && purchase) {
        const original = {
          supplierId: purchase.supplierId,
          currencyId: purchase.currencyId,
          invoiceNumber: purchase.invoiceNumber,
          purchaseDate: purchase.purchaseDate,
          exchangeRate: purchase.exchangeRate,
          notes: purchase.notes,
        };

        const next = {
          supplierId: values.supplierId,
          currencyId: values.currencyId,
          invoiceNumber: values.invoiceNumber,
          purchaseDate: values.purchaseDate,
          exchangeRate: values.exchangeRate,
          notes: values.notes,
        };

        const payload = diffPayload(original, next);
        if (isEmptyPayload(payload)) {
          navigate(`/purchases/${purchase.id}`);
          return;
        }

        await updatePurchase.mutateAsync(payload);
        navigate(`/purchases/${purchase.id}`);
        return;
      }

      const created = await createPurchase.mutateAsync(values);
      navigate(`/purchases/${created.id}`);
    } catch (error) {
      handleFormError(error, setError, { knownFields: PURCHASE_FORM_FIELDS });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          <FormSection title="Datos de la compra">
            <FormRow columns={2}>
              <FormField label="Proveedor" htmlFor="supplierId" error={errors.supplierId} required>
                <Controller
                  control={control}
                  name="supplierId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="supplierId" aria-invalid={errors.supplierId ? true : undefined}>
                        <SelectValue placeholder="Selecciona un proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="Fecha de compra" htmlFor="purchaseDate" error={errors.purchaseDate} required>
                <Input
                  {...fieldAria('purchaseDate', errors.purchaseDate)}
                  type="date"
                  {...register('purchaseDate')}
                />
              </FormField>
            </FormRow>

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
                label="Tasa de cambio"
                htmlFor="exchangeRate"
                error={errors.exchangeRate}
                required
                hint={isDop ? `Fija en 1 para ${REPORTING_CURRENCY}` : 'Pesos por unidad de la moneda'}
              >
                <Input
                  {...fieldAria('exchangeRate', errors.exchangeRate)}
                  type="number"
                  step="0.0001"
                  min={0}
                  disabled={isDop}
                  {...register('exchangeRate')}
                />
              </FormField>

              <FormField label="Numero de factura" htmlFor="invoiceNumber" error={errors.invoiceNumber}>
                <Input
                  {...fieldAria('invoiceNumber', errors.invoiceNumber)}
                  placeholder="INV-9981"
                  {...register('invoiceNumber')}
                />
              </FormField>
            </FormRow>

            {!isEdit && (
              <FormRow columns={2}>
                <FormField
                  label="Numero de compra"
                  htmlFor="purchaseNumber"
                  error={errors.purchaseNumber}
                  hint="Opcional: si lo dejas vacio el sistema genera COM-ANO-NNNNNN."
                >
                  <Input
                    {...fieldAria('purchaseNumber', errors.purchaseNumber)}
                    placeholder="Se genera automaticamente"
                    {...register('purchaseNumber')}
                  />
                </FormField>

                <FormField label="Estado inicial" htmlFor="status" error={errors.status} required>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['pending', 'in_transit', 'received'] as const).map((status) => (
                            <SelectItem key={status} value={status}>
                              {PURCHASE_STATUS_META[status].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </FormRow>
            )}

            <FormField label="Notas" htmlFor="notes" error={errors.notes}>
              <Textarea {...fieldAria('notes', errors.notes)} rows={3} {...register('notes')} />
            </FormField>
          </FormSection>
        </CardContent>
      </Card>

      {/* Los items solo se definen al crear: despues son inmutables. */}
      {!isEdit && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-semibold">Unidades compradas</h3>
                <p className="text-xs text-muted-foreground">
                  Un vehiculo pertenece a una sola compra. La compra debe llevar al menos una unidad.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ ...EMPTY_ITEM })}>
                <Plus />
                Agregar
              </Button>
            </div>

            {errors.items?.message && (
              <p className="text-xs font-medium text-danger">{errors.items.message}</p>
            )}

            <div className="flex flex-col gap-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Unidad {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        aria-label={`Quitar unidad ${index + 1}`}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <FormField
                      label="Vehiculo"
                      htmlFor={`items.${index}.vehicleId`}
                      error={errors.items?.[index]?.vehicleId}
                      required
                    >
                      <Controller
                        control={control}
                        name={`items.${index}.vehicleId`}
                        render={({ field: itemField }) => (
                          <VehiclePicker
                            id={`items.${index}.vehicleId`}
                            value={itemField.value || null}
                            onChange={itemField.onChange}
                            invalid={Boolean(errors.items?.[index]?.vehicleId)}
                          />
                        )}
                      />
                    </FormField>

                    <FormRow columns={4}>
                      <FormField
                        label="Costo unitario"
                        htmlFor={`items.${index}.unitCost`}
                        error={errors.items?.[index]?.unitCost}
                        required
                      >
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          {...register(`items.${index}.unitCost`)}
                        />
                      </FormField>

                      <FormField
                        label="Flete"
                        htmlFor={`items.${index}.freightCost`}
                        error={errors.items?.[index]?.freightCost}
                      >
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          {...register(`items.${index}.freightCost`)}
                        />
                      </FormField>

                      <FormField
                        label="Seguro"
                        htmlFor={`items.${index}.insuranceCost`}
                        error={errors.items?.[index]?.insuranceCost}
                      >
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          {...register(`items.${index}.insuranceCost`)}
                        />
                      </FormField>

                      <FormField
                        label="Otros costos"
                        htmlFor={`items.${index}.otherCosts`}
                        error={errors.items?.[index]?.otherCosts}
                      >
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          {...register(`items.${index}.otherCosts`)}
                        />
                      </FormField>
                    </FormRow>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
              <span className="text-sm font-medium">Total de la compra</span>
              <span className="tabular text-lg font-semibold">
                {formatMoney(total, currency?.code)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(purchase ? `/purchases/${purchase.id}` : '/purchases')}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Guardar cambios' : 'Registrar compra'}
        </Button>
      </div>
    </form>
  );
}
