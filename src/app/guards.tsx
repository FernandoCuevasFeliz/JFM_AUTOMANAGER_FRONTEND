import { ShieldX } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
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

  if (status === 'loading') {
    return <FullPageLoader label="Restaurando sesion…" />;
  }

  if (status === 'unauthenticated') {
    // No se guarda a donde iba: el login manda siempre al tablero, porque quien
    // vuelve a entrar puede ser otro usuario con otros permisos (ver
    // `login-page.tsx`).
    return <Navigate to="/login" replace />;
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
