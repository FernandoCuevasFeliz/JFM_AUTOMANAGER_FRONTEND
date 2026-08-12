import { ShieldX } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { EmptyState, FullPageLoader } from '@/components/states';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { Link } from 'react-router-dom';

/**
 * Guarda de autenticacion.
 *
 * Mientras el arranque canjea el refresh token no se decide nada: renderizar
 * el login en ese hueco haria parpadear la pantalla en cada recarga.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <FullPageLoader label="Restaurando sesion…" />;
  }

  if (status === 'unauthenticated') {
    // Se recuerda a donde iba para volver alli tras iniciar sesion.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}

/**
 * Guarda por permiso. Es una comodidad de UX, no una medida de seguridad: cada
 * endpoint vuelve a exigir el permiso en el servidor.
 */
export function RequirePermission({ permission }: { permission: string }) {
  const { can } = useAuth();

  if (!can(permission)) {
    return <ForbiddenScreen />;
  }

  return <Outlet />;
}

export function ForbiddenScreen() {
  return (
    <EmptyState
      icon={ShieldX}
      title="No tienes acceso a esta seccion"
      description="Tu usuario no cuenta con el permiso necesario. Si crees que es un error, contacta al administrador."
      action={
        <Button variant="outline" asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      }
      className="min-h-[60vh]"
    />
  );
}
