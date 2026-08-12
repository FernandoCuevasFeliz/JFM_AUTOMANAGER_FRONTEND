import { zodResolver } from '@hookform/resolvers/zod';
import { Car, Eye, EyeOff } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FormField, fieldAria } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleFormError, isApiError } from '@/lib/errors';
import { useAuth } from '../use-auth';
import { type LoginInput, loginSchema } from '../schemas';

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/', { replace: true });
    } catch (error) {
      // El backend no distingue si el correo existe: el 401 se muestra como
      // un error general del formulario, no atribuido a un campo.
      if (isApiError(error) && error.code === 'UNAUTHORIZED') {
        setError('root', { type: 'server', message: error.message });
        return;
      }
      handleFormError(error, setError, { knownFields: ['email', 'password'] });
    }
  });

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40 lg:flex-row">
      {/* Panel de marca: solo aporta en escritorio, se oculta en movil. */}
      <aside className="hidden bg-primary p-12 text-primary-foreground lg:flex lg:w-2/5 lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <Car className="size-5" />
          </div>
          <span className="text-lg font-semibold">JFM AutoManager</span>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold leading-tight">
            Inventario y ventas de vehiculos, en un solo lugar.
          </h1>
          <p className="max-w-md text-sm text-primary-foreground/80">
            Controla la importacion, los costos por unidad y el ciclo comercial completo, desde la
            cotizacion hasta el ultimo cobro.
          </p>
        </div>

        <p className="text-xs text-primary-foreground/70">EJGH AUTO IMPORT SRL · Republica Dominicana</p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Car className="size-6" />
            </div>
            <span className="text-lg font-semibold">JFM AutoManager</span>
          </div>

          <div className="mb-6 flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-tight">Iniciar sesion</h2>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para acceder al panel.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormField label="Correo electronico" htmlFor="email" error={errors.email} required>
              <Input
                {...fieldAria('email', errors.email)}
                type="email"
                autoComplete="email"
                placeholder="usuario@ejghautoimport.com"
                autoFocus
                {...register('email')}
              />
            </FormField>

            <FormField label="Contrasena" htmlFor="password" error={errors.password} required>
              <div className="relative">
                <Input
                  {...fieldAria('password', errors.password)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-0 top-0 flex h-9 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </FormField>

            {errors.root && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {errors.root.message}
              </p>
            )}

            <Button type="submit" className="mt-2 w-full" loading={isSubmitting}>
              Entrar
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
