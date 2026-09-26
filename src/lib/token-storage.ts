/**
 * Persistencia de los tokens de sesion.
 *
 * El backend no usa cookies: decide el cliente donde guardarlos (§2 de API.md).
 * Aqui se usa `localStorage` para que la sesion sobreviva a recargas y pestanas
 * nuevas. Queda aislado en este modulo para poder cambiarlo (sessionStorage,
 * memoria + BFF) sin tocar el resto de la app.
 */

const ACCESS_TOKEN_KEY = 'jfm.accessToken';
const REFRESH_TOKEN_KEY = 'jfm.refreshToken';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Modo privado o storage bloqueado: la sesion vive solo en memoria.
    return null;
  }
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return safeGet(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return safeGet(REFRESH_TOKEN_KEY);
  },

  save(tokens: StoredTokens): void {
    try {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } catch {
      /* ignorado a proposito: ver safeGet */
    }
  },

  clear(): void {
    try {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      /* ignorado a proposito: ver safeGet */
    }
  },
};
