import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FormField, fieldAria } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { handleFormError } from '@/lib/errors';
import { authApi } from '../api';
import { type ChangePasswordInput, changePasswordSchema } from '../schemas';
import { useAuth } from '../use-auth';

/**
 * Cambio de la propia contrasena.
 *
 * El backend **cierra todas las sesiones**, incluida la actual, asi que tras el
 * 204 hay que limpiar la sesion local y volver al login (§2 de API.md).
 */
export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { endSession } = useAuth();

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      toast.success('Contrasena actualizada', {
        description: 'Se cerraron todas las sesiones. Inicia sesion de nuevo.',
      });

      endSession();
      navigate('/login', { replace: true });
    } catch (error) {
      handleFormError(error, setError, { knownFields: ['currentPassword', 'newPassword'] });
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cambiar contrasena"
        description="Al cambiarla se cierran todas tus sesiones abiertas."
        backTo="/"
        backLabel="Volver al tablero"
      />

      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormField
              label="Contrasena actual"
              htmlFor="currentPassword"
              error={errors.currentPassword}
              required
            >
              <Input
                {...fieldAria('currentPassword', errors.currentPassword)}
                type="password"
                autoComplete="current-password"
                {...register('currentPassword')}
              />
            </FormField>

            <FormField
              label="Nueva contrasena"
              htmlFor="newPassword"
              error={errors.newPassword}
              required
              hint="Entre 8 y 72 caracteres, con al menos una letra y un numero."
            >
              <Input
                {...fieldAria('newPassword', errors.newPassword)}
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
              />
            </FormField>

            <FormField
              label="Confirmar nueva contrasena"
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

            <Button type="submit" className="mt-2 w-fit" loading={isSubmitting}>
              Cambiar contrasena
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
