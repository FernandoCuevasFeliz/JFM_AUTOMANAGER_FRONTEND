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
import { ClientPicker } from '@/features/clients/components/client-picker';
import { VehiclePicker } from '@/features/vehicles/components/vehicle-picker';
import { addDaysCivil, todayCivil } from '@/lib/dates';
import { handleFormError } from '@/lib/errors';
import { RESERVABLE_VEHICLE_STATUSES } from '@/lib/status';
import { diffPayload, isEmptyPayload } from '@/lib/zod-helpers';
import { useCreateReservation, useUpdateReservation } from '../hooks';
import {
  RESERVATION_FORM_FIELDS,
  type CreateReservationValues,
  createReservationSchema,
  updateReservationSchema,
} from '../schemas';
import type { Reservation } from '../types';

/**
 * Alta de reservas y prorroga de las existentes.
 *
 * Solo se reserva una unidad **en inventario** (§7 de API.md), asi que el
 * selector filtra por ese estado. Al editar, cliente y vehiculo quedan fijos:
 * el backend solo acepta el deposito y el vencimiento.
 */
export function ReservationFormDialog({
  reservation,
  open,
  onOpenChange,
  /** Cotizacion de origen, al reservar desde una cotizacion aprobada. */
  fromQuotation,
}: {
  reservation?: Reservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromQuotation?: { id: string; clientId: string; vehicleId: string; number: string };
}) {
  const isEdit = Boolean(reservation);

  const createReservation = useCreateReservation();
  const updateReservation = useUpdateReservation(reservation?.id ?? '');

  const defaultValues = React.useMemo<CreateReservationValues>(
    () => ({
      quotationId: reservation?.quotationId ?? fromQuotation?.id ?? null,
      clientId: reservation?.clientId ?? fromQuotation?.clientId ?? '',
      vehicleId: reservation?.vehicleId ?? fromQuotation?.vehicleId ?? '',
      depositAmount: reservation?.depositAmount ?? ('' as unknown as number),
      reservationDate: reservation?.reservationDate ?? todayCivil(),
      // Por defecto, 30 dias de plazo.
      expirationDate: reservation?.expirationDate ?? addDaysCivil(todayCivil(), 30),
    }),
    [reservation, fromQuotation],
  );

  const form = useForm<CreateReservationValues>({
    resolver: zodResolver(isEdit ? (updateReservationSchema as never) : createReservationSchema),
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
      if (isEdit && reservation) {
        const payload = diffPayload(
          {
            depositAmount: reservation.depositAmount,
            expirationDate: reservation.expirationDate,
          },
          {
            depositAmount: values.depositAmount,
            expirationDate: values.expirationDate,
          },
        );

        if (isEmptyPayload(payload)) {
          onOpenChange(false);
          return;
        }

        await updateReservation.mutateAsync(payload);
      } else {
        await createReservation.mutateAsync(values);
      }

      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: RESERVATION_FORM_FIELDS });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar reserva' : 'Nueva reserva'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Se pueden ajustar el deposito y la fecha de vencimiento.'
              : 'Al crear la reserva el vehiculo pasa a reservado y la cotizacion queda convertida.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {fromQuotation && !isEdit && (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              Nace de la cotizacion <strong>{fromQuotation.number}</strong>, que quedara marcada como
              convertida.
            </p>
          )}

          <FormField label="Cliente" htmlFor="clientId" error={errors.clientId} required>
            {isEdit ? (
              <Input value={reservation?.clientName ?? ''} disabled />
            ) : (
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <ClientPicker
                    id="clientId"
                    value={field.value || null}
                    onChange={field.onChange}
                    disabled={Boolean(fromQuotation)}
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
            hint={isEdit ? undefined : 'Solo se reservan unidades en inventario.'}
          >
            {isEdit ? (
              <Input
                value={`${reservation?.vehicleBrandName} ${reservation?.vehicleModelName} · ${reservation?.vehicleChassisNumber}`}
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
                    statuses={RESERVABLE_VEHICLE_STATUSES}
                    disabled={Boolean(fromQuotation)}
                    invalid={Boolean(errors.vehicleId)}
                  />
                )}
              />
            )}
          </FormField>

          <FormRow columns={3}>
            <FormField label="Deposito" htmlFor="depositAmount" error={errors.depositAmount} required>
              <Input
                {...fieldAria('depositAmount', errors.depositAmount)}
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                {...register('depositAmount')}
              />
            </FormField>

            <FormField
              label="Fecha de reserva"
              htmlFor="reservationDate"
              error={errors.reservationDate}
              required
            >
              <Input
                {...fieldAria('reservationDate', errors.reservationDate)}
                type="date"
                disabled={isEdit}
                {...register('reservationDate')}
              />
            </FormField>

            <FormField label="Vence el" htmlFor="expirationDate" error={errors.expirationDate} required>
              <Input
                {...fieldAria('expirationDate', errors.expirationDate)}
                type="date"
                {...register('expirationDate')}
              />
            </FormField>
          </FormRow>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Guardar cambios' : 'Crear reserva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
