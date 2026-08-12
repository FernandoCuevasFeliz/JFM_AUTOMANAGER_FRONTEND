import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/use-auth';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { reservationsApi } from './api';
import type { CreateReservationValues, UpdateReservationValues } from './schemas';
import type { ReservationListParams } from './types';

export function useReservations(params: ReservationListParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.reservations(params),
    queryFn: () => reservationsApi.list(params),
    enabled: can('reservations:read'),
    placeholderData: (previous) => previous,
  });
}

export function useReservation(id: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.reservation(id ?? ''),
    queryFn: () => reservationsApi.getById(id as string),
    enabled: Boolean(id) && can('reservations:read'),
  });
}

/**
 * Una reserva mueve el estado del vehiculo y el de la cotizacion de origen, asi
 * que hay que invalidar los tres recursos.
 */
function useInvalidateReservations() {
  const queryClient = useQueryClient();

  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    void queryClient.invalidateQueries({ queryKey: ['quotations'] });
    if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.reservation(id) });
  };
}

export function useCreateReservation() {
  const invalidate = useInvalidateReservations();

  return useMutation({
    mutationFn: (input: CreateReservationValues) => reservationsApi.create(input),
    onSuccess: (reservation) => {
      toast.success('Reserva creada', {
        description: `${reservation.reservationNumber} · el vehiculo paso a reservado.`,
      });
      invalidate(reservation.id);
    },
  });
}

export function useUpdateReservation(id: string) {
  const invalidate = useInvalidateReservations();

  return useMutation({
    mutationFn: (input: UpdateReservationValues) => reservationsApi.update(id, input),
    onSuccess: () => {
      toast.success('Reserva actualizada');
      invalidate(id);
    },
  });
}

export function useCancelReservation() {
  const invalidate = useInvalidateReservations();

  return useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => {
      toast.success('Reserva cancelada', { description: 'El vehiculo volvio a inventario.' });
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo cancelar la reserva' }),
  });
}

export function useExpireOverdueReservations() {
  const invalidate = useInvalidateReservations();

  return useMutation({
    mutationFn: () => reservationsApi.expireOverdue(),
    onSuccess: (result) => {
      toast.success(
        result.expired === 0
          ? 'No habia reservas vencidas'
          : `${result.expired} reserva(s) vencidas · ${result.releasedVehicles} vehiculo(s) liberados`,
      );
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo ejecutar el vencimiento' }),
  });
}
