import { Plus, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { FormField, fieldAria } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReservations } from '@/features/reservations/hooks';
import { VehiclePicker } from '@/features/vehicles/components/vehicle-picker';
import { useVehicle } from '@/features/vehicles/hooks';
import { REPORTING_CURRENCY, formatMoney, formatPercentage } from '@/lib/money';
import { SELLABLE_VEHICLE_STATUSES } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { CreateSaleValues } from '../schemas';

/**
 * Vehiculos de la venta.
 *
 * Una venta es una cabecera con **varias lineas**, cada una con su precio. El
 * total no se teclea: se calcula sumando las lineas, igual que hace el backend,
 * que ni siquiera guarda ese campo.
 */
export function SaleItemsField({
  /** Con origen en reserva o cotizacion, esa unidad viene fijada. */
  lockedVehicleId,
  currencyCode,
  isDop,
  exchangeRate,
}: {
  lockedVehicleId?: string | null;
  currencyCode: string | undefined;
  isDop: boolean;
  exchangeRate: number;
}) {
  const {
    control,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateSaleValues>();

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items') ?? [];

  const total = items.reduce((suma, item) => {
    const precio = Number(item?.salePrice);
    return Number.isFinite(precio) ? suma + precio : suma;
  }, 0);

  // El mensaje del array (minimo uno, vehiculo repetido) no cuelga de ninguna
  // fila concreta, asi que se muestra aparte.
  const errorDeLista = (errors.items as { message?: string } | undefined)?.message;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium">Vehiculos de la venta</span>
          <span className="text-xs text-muted-foreground">
            Cada unidad lleva su propio precio pactado.
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ vehicleId: '', salePrice: '' as unknown as number })}
        >
          <Plus />
          Agregar vehiculo
        </Button>
      </div>

      {errorDeLista && (
        <p role="alert" className="text-xs font-medium text-danger">
          {errorDeLista}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <li key={field.id}>
            <SaleItemRow
              index={index}
              isDop={isDop}
              exchangeRate={exchangeRate}
              // La unidad que viene del documento de origen no se puede quitar:
              // sin ella la venta dejaria de convertir su reserva.
              locked={lockedVehicleId ? items[index]?.vehicleId === lockedVehicleId : false}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
              setValue={setValue}
              register={register}
              control={control}
              errors={errors}
            />
          </li>
        ))}
      </ul>

      {items.length > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
          <span className="text-[13px] font-medium">
            Total de la venta · {items.length} unidades
          </span>
          <span className="num text-base font-semibold">{formatMoney(total, currencyCode)}</span>
        </div>
      )}
    </div>
  );
}

function SaleItemRow({
  index,
  isDop,
  exchangeRate,
  locked,
  canRemove,
  onRemove,
  setValue,
  register,
  control,
  errors,
}: {
  index: number;
  isDop: boolean;
  exchangeRate: number;
  locked: boolean;
  canRemove: boolean;
  onRemove: () => void;
  setValue: ReturnType<typeof useFormContext<CreateSaleValues>>['setValue'];
  register: ReturnType<typeof useFormContext<CreateSaleValues>>['register'];
  control: ReturnType<typeof useFormContext<CreateSaleValues>>['control'];
  errors: ReturnType<typeof useFormContext<CreateSaleValues>>['formState']['errors'];
}) {
  const { watch } = useFormContext<CreateSaleValues>();

  const vehicleId = watch(`items.${index}.vehicleId`);
  const salePrice = Number(watch(`items.${index}.salePrice`));
  const vehicle = useVehicle(vehicleId || undefined).data;

  const itemErrors = errors.items?.[index];

  /*
   * El precio de lista es una REFERENCIA, no un limite: el real se pacta en la
   * venta. La comparacion va **en pesos** porque `vehicles.sale_price` no tiene
   * moneda —esta en la de reporte— y restarlo en crudo de una venta en dolares
   * anunciaba descuentos del 98 %.
   */
  const listPrice = vehicle?.salePrice ?? null;
  const precioEnPesos =
    Number.isFinite(salePrice) && salePrice > 0 && exchangeRate > 0
      ? Math.round(salePrice * exchangeRate * 100) / 100
      : null;
  const brecha =
    listPrice !== null && precioEnPesos !== null
      ? Math.round((precioEnPesos - listPrice) * 100) / 100
      : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 shadow-card">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <FormField
          label={`Vehiculo ${index + 1}`}
          htmlFor={`items.${index}.vehicleId`}
          error={itemErrors?.vehicleId}
          required
          hint={locked ? 'Lo fija el documento de origen.' : undefined}
        >
          <Controller
            control={control}
            name={`items.${index}.vehicleId`}
            render={({ field }) => (
              <VehiclePicker
                id={`items.${index}.vehicleId`}
                value={field.value || null}
                onChange={field.onChange}
                statuses={SELLABLE_VEHICLE_STATUSES}
                disabled={locked}
                invalid={Boolean(itemErrors?.vehicleId)}
              />
            )}
          />
        </FormField>

        {canRemove && !locked && (
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRemove}
              aria-label={`Quitar el vehiculo ${index + 1}`}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      <FormField
        label="Precio pactado"
        htmlFor={`items.${index}.salePrice`}
        error={itemErrors?.salePrice}
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
              {...fieldAria(`items.${index}.salePrice`, itemErrors?.salePrice)}
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              className="num"
              {...register(`items.${index}.salePrice`)}
            />
            {/*
              «Usar lista» solo tiene sentido en pesos: el precio de lista esta
              en la moneda de reporte, y volcarlo tal cual en una venta en
              dolares pondria 1.850.000 dolares.
            */}
            {listPrice !== null && isDop && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setValue(`items.${index}.salePrice`, listPrice, { shouldValidate: true })
                }
              >
                Usar lista
              </Button>
            )}
          </div>

          {/* La desviacion se muestra, no se bloquea. Siempre en pesos. */}
          {brecha !== null && Math.abs(brecha) >= 0.01 && (
            <p
              className={cn(
                'text-xs leading-relaxed',
                brecha < 0 ? 'text-warning' : 'text-success',
              )}
            >
              {brecha < 0 ? 'Por debajo del precio de lista: ' : 'Por encima del precio de lista: '}
              <span className="num font-medium">
                {formatMoney(Math.abs(brecha), REPORTING_CURRENCY)}
              </span>
              {listPrice !== null && listPrice > 0 && <> ({formatPercentage(Math.abs((brecha / listPrice) * 100))})</>}
              {!isDop && precioEnPesos !== null && (
                <>
                  {' '}· equivale a{' '}
                  <span className="num font-medium">
                    {formatMoney(precioEnPesos, REPORTING_CURRENCY)}
                  </span>{' '}
                  a la tasa indicada
                </>
              )}
            </p>
          )}
        </div>
      </FormField>

      {/*
        Vender una unidad `reserved` es legitimo —es como se convierte una
        reserva— pero hacerlo por fuera deja la reserva abierta, con el deposito
        de otra persona dentro, y la unidad vendida a un tercero.
      */}
      {vehicle?.status === 'reserved' && !locked && <AvisoUnidadReservada vehicleId={vehicle.id} />}
    </div>
  );
}

function AvisoUnidadReservada({ vehicleId }: { vehicleId: string }) {
  const { data } = useReservations({ page: 1, pageSize: 1, vehicleId, status: 'active' });
  const reserva = data?.data?.[0];

  return (
    <p className="rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-xs leading-relaxed">
      Esta unidad esta <strong>reservada</strong>
      {reserva && (
        <>
          {' '}
          por <strong className="num">{reserva.reservationNumber}</strong> ({reserva.clientName})
        </>
      )}
      . Si vendes por fuera de esa reserva, seguira abierta con su deposito dentro.
    </p>
  );
}
