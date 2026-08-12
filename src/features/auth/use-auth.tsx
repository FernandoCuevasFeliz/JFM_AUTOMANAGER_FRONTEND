import * as React from 'react';
import { type SessionPayload, type SessionUser, refreshSession, registerSessionHandlers } from '@/lib/api-client';
import { queryClient } from '@/lib/query-client';
import { tokenStorage } from '@/lib/token-storage';
import { authApi } from './api';

/**
 * Contexto de sesion: usuario, permisos y las operaciones que los cambian.
 *
 * Arranca con `POST /auth/refresh`, no con `/auth/me` (§4 de API.md): el
 * refresco devuelve tokens nuevos, el usuario **y** el array de permisos en una
 * sola llamada, mientras que `/auth/me` no trae permisos.
 */

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  permissions: string[];
  /** Unica via de control de acceso en el cliente: nunca se mira el rol. */
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** Limpia la sesion sin llamar al backend (tras cambiar contrasena o cerrar todo). */
  endSession: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

interface SessionState {
  status: AuthStatus;
  user: SessionUser | null;
  permissions: string[];
}

const EMPTY_SESSION: SessionState = { status: 'loading', user: null, permissions: [] };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<SessionState>(EMPTY_SESSION);

  const applySession = React.useCallback((payload: SessionPayload) => {
    tokenStorage.save({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    });
    setSession({
      status: 'authenticated',
      user: payload.user,
      permissions: payload.permissions ?? [],
    });
  }, []);

  const endSession = React.useCallback(() => {
    tokenStorage.clear();
    // La cache pertenece a la sesion que la lleno: si no se limpia, el
    // siguiente usuario veria por un instante los datos del anterior.
    queryClient.clear();
    setSession({ status: 'unauthenticated', user: null, permissions: [] });
  }, []);

  /**
   * El cliente HTTP avisa cuando renueva la sesion por su cuenta (asi los
   * permisos se mantienen al dia si cambiaron) y cuando el refresco falla.
   */
  React.useEffect(() => {
    return registerSessionHandlers({
      onRenewed: (payload) => {
        setSession({
          status: 'authenticated',
          user: payload.user,
          permissions: payload.permissions ?? [],
        });
      },
      onExpired: endSession,
    });
  }, [endSession]);

  // Arranque: si hay refresh token guardado, se canjea por una sesion completa.
  React.useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!tokenStorage.getRefreshToken()) {
        setSession({ status: 'unauthenticated', user: null, permissions: [] });
        return;
      }

      const payload = await refreshSession();
      if (cancelled) return;

      if (payload) {
        applySession(payload);
      } else {
        tokenStorage.clear();
        setSession({ status: 'unauthenticated', user: null, permissions: [] });
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = React.useCallback(
    async (credentials: { email: string; password: string }) => {
      const payload = await authApi.login(credentials);
      applySession(payload);
    },
    [applySession],
  );

  const logout = React.useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();

    if (refreshToken) {
      // Siempre responde 204; si falla la red igual cerramos en el cliente.
      await authApi.logout(refreshToken).catch(() => undefined);
    }

    endSession();
  }, [endSession]);

  const value = React.useMemo<AuthContextValue>(() => {
    const permissions = session.permissions;

    return {
      status: session.status,
      user: session.user,
      permissions,
      can: (permission: string) => permissions.includes(permission),
      canAny: (required: string[]) => required.some((permission) => permissions.includes(permission)),
      login,
      logout,
      endSession,
    };
  }, [session, login, logout, endSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}

/** Atajo para condicionar un boton o una columna a un permiso. */
export function useCan(permission: string): boolean {
  return useAuth().can(permission);
}
