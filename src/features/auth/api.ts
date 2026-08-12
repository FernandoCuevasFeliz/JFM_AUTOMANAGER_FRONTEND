import { type SessionPayload, type SessionUser, apiRequest } from '@/lib/api-client';
import type { AuthSession, LogoutAllResult } from './types';

/**
 * Endpoints de `/auth` (§2 de API.md).
 *
 * `login`, `refresh` y `logout` son publicos: no adjuntan el access token
 * (`skipAuth`) y por tanto tampoco disparan el interceptor de refresco.
 */
export const authApi = {
  login(credentials: { email: string; password: string }) {
    return apiRequest<SessionPayload>('/auth/login', {
      method: 'POST',
      body: credentials,
      skipAuth: true,
    });
  },

  /**
   * Solo para el arranque manual. Durante la vida de la app el refresco lo
   * gestiona el cliente HTTP con su promesa compartida.
   */
  refresh(refreshToken: string) {
    return apiRequest<SessionPayload>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true,
    });
  },

  /** Siempre 204, exista el token o no. */
  logout(refreshToken: string) {
    return apiRequest<void>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true,
    });
  },

  me() {
    return apiRequest<SessionUser>('/auth/me');
  },

  sessions() {
    return apiRequest<AuthSession[]>('/auth/sessions');
  },

  /** Cierra la sesion en todos los dispositivos, incluido el actual. */
  logoutAll() {
    return apiRequest<LogoutAllResult>('/auth/logout-all', { method: 'POST' });
  },

  /** Tras el 204 hay que volver al login: cierra todas las sesiones. */
  changePassword(body: { currentPassword: string; newPassword: string }) {
    return apiRequest<void>('/auth/change-password', { method: 'POST', body });
  },
};
