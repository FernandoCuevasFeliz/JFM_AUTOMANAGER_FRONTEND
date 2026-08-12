import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { FormField, fieldAria } from '@/components/form-field';
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
import { handleFormError } from '@/lib/errors';
import { useResetUserPassword } from '../hooks';
import { type ResetPasswordValues, resetPasswordSchema } from '../schemas';
import { type User, userFullName } from '../types';

/** Restablece la contrasena de otro usuario; no pide la actual. */
export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const resetPassword = useResetUserPassword(user?.id ?? '');

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) reset({ newPassword: '', confirmPassword: '' });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await resetPassword.mutateAsync(values.newPassword);
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: ['newPassword'] });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contrasena</DialogTitle>
          <DialogDescription>
            {user ? `Se asignara una contrasena nueva a ${userFullName(user)}.` : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Nueva contrasena"
            htmlFor="newPassword"
            error={errors.newPassword}
            required
            hint="Minimo 8 caracteres, con al menos una letra y un numero."
          >
            <Input
              {...fieldAria('newPassword', errors.newPassword)}
              type="password"
              autoComplete="new-password"
              {...register('newPassword')}
            />
          </FormField>

          <FormField
            label="Confirmar contrasena"
            htmlFor="confirmPassword"
            error={errors.confirmPassword}
            required
          >
            <Input
              {...fieldAria('confirmPassword', errors.confirmPassword)}
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
          </FormField>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Restablecer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
