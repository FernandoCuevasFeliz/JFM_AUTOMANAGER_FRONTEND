import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Car, Eye, EyeOff } from 'lucide-react';
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
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      {/*
        Panel de marca. Solo aporta en escritorio, asi que en movil desaparece
        entero en vez de encogerse a una franja decorativa que roba altura al
        formulario.
      */}
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-accent-foreground lg:flex lg:w-[42%] lg:max-w-2xl lg:flex-col lg:justify-between">
        {/* Retícula de plano tecnico: textura, no ilustracion. */}
        <div className="grid-blueprint pointer-events-none absolute inset-0 text-white/70" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-signal/12 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-signal text-signal-foreground">
            <Car className="size-5" aria-hidden />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight">
              JFM<span className="font-normal text-sidebar-foreground"> AutoManager</span>
            </span>
            <span className="label-micro mt-1 text-sidebar-muted">EJGH Auto Import</span>
          </span>
        </div>

        <div className="relative flex flex-col gap-5">
          <span className="h-1 w-14 rounded-full bg-signal" aria-hidden />
          <h1 className="max-w-md text-[2.5rem] font-bold leading-[1.08] tracking-[-0.03em]">
            Inventario y ventas de vehiculos, en un solo lugar.
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-sidebar-foreground">
            Controla la importacion, los costos por unidad y el ciclo comercial completo, desde la
            cotizacion hasta el ultimo cobro.
          </p>
        </div>

        <p className="label-micro relative text-sidebar-muted">
          EJGH Auto Import SRL · Republica Dominicana
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[23rem]">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <span className="flex size-12 items-center justify-center rounded-xl bg-signal text-signal-foreground">
              <Car className="size-6" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight">
              JFM<span className="font-normal text-muted-foreground"> AutoManager</span>
            </span>
          </div>

          <div className="mb-7 flex flex-col gap-1.5">
            <h2 className="text-[26px] font-bold leading-tight tracking-[-0.025em]">
              Iniciar sesion
            </h2>
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
                  className="hit-target absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </FormField>

            {errors.root && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger/8 px-3 py-2.5 text-[13px] font-medium text-danger"
              >
                <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
                {errors.root.message}
              </p>
            )}

            <Button type="submit" size="lg" className="mt-2 w-full" loading={isSubmitting}>
              Entrar
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground lg:hidden">
            EJGH Auto Import SRL · Republica Dominicana
          </p>
        </div>
      </main>
    </div>
  );
}
