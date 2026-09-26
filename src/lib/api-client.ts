import { ApiError } from './api-error';
import type { PageMeta, QueryParams } from './api-types';
import { API_URL } from './env';
import { tokenStorage } from './token-storage';

/**
 * Cliente HTTP unico de la aplicacion.
 *
 * Se encarga de tres cosas que ningun modulo deberia repetir:
 *  1. adjuntar el `Authorization: Bearer <accessToken>`;
 *  2. renovar la sesion ante un 401 con una **unica promesa compartida**
 *     (§2 de API.md: si varias peticiones refrescan a la vez, la primera rota
 *     el token y el resto lo presenta ya usado, el backend lo lee como robo y
 *     cierra todas las sesiones);
 *  3. desenvolver `{ data, meta }` y convertir `{ error }` en `ApiError`.
 */

// --- Forma de la sesion que devuelven /auth/login y /auth/refresh ------------

export interface SessionUser {
  readonly id: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly isActive: boolean;
  readonly lastLoginAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface SessionPayload {
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly refreshToken: string;
  readonly refreshExpiresAt: string;
  readonly user: SessionUser;
  readonly permissions: string[];
}

// --- Puente con el contexto de sesion ---------------------------------------

type SessionListener = (session: SessionPayload) => void;
type ExpiredListener = () => void;

let onSessionRenewed: SessionListener | null = null;
let onSessionExpired: ExpiredListener | null = null;

/**
 * `use-auth` se registra aqui al montarse. El cliente no importa nada de
 * `features/` para no crear un ciclo: solo emite eventos.
 */
export function registerSessionHandlers(handlers: {
  onRenewed: SessionListener;
  onExpired: ExpiredListener;
}): () => void {
  onSessionRenewed = handlers.onRenewed;
  onSessionExpired = handlers.onExpired;
  return () => {
    onSessionRenewed = null;
    onSessionExpired = null;
  };
}

// --- Refresco de sesion (single-flight) -------------------------------------

/** Promesa compartida mientras hay un refresco en vuelo. */
let refreshInFlight: Promise<SessionPayload | null> | null = null;

async function performRefresh(): Promise<SessionPayload | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Un refresh fallido es sesion terminada: no se reintenta (§2 de API.md).
      return null;
    }

    const body = (await response.json()) as { data: SessionPayload };
    tokenStorage.save({
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
    });
    onSessionRenewed?.(body.data);
    return body.data;
  } catch {
    return null;
  }
}

/**
 * Devuelve la sesion renovada, compartiendo el intento entre todas las
 * peticiones que hayan fallado con 401 al mismo tiempo.
 */
export function refreshSession(): Promise<SessionPayload | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// --- Construccion de la peticion --------------------------------------------

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Cuerpo JSON; se serializa aqui. */
  body?: unknown;
  /** Query string; los `undefined`/`null` se descartan y los arrays se repiten. */
  query?: QueryParams;
  /** Endpoints publicos (`/auth/*`) no adjuntan token ni reintentan. */
  skipAuth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${API_URL}${path}`);
  if (!query) return url.toString();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      // Filtros repetibles: ?status=in_inventory&status=reserved
      for (const item of value) url.searchParams.append(key, String(item));
      continue;
    }

    // Los booleanos viajan como texto literal (`?isActive=true`).
    url.searchParams.append(key, String(value));
  }

  return url.toString();
}

interface RawResponse<T> {
  data: T;
  meta?: PageMeta;
}

async function parse<T>(response: Response): Promise<RawResponse<T>> {
  if (response.status === 204) {
    return { data: undefined as T };
  }

  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError(
        'INTERNAL_ERROR',
        'El servidor devolvio una respuesta que no se pudo interpretar.',
        response.status,
      );
    }
  }

  if (!response.ok) {
    throw ApiError.fromResponse(response.status, body);
  }

  return (body ?? { data: undefined }) as RawResponse<T>;
}

async function send<T>(path: string, options: RequestOptions, isRetry: boolean): Promise<RawResponse<T>> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!options.skipAuth) {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw ApiError.network();
  }

  // Un 401 en una ruta autenticada dispara un unico refresco compartido.
  if (response.status === 401 && !options.skipAuth && !isRetry) {
    const renewed = await refreshSession();
    if (!renewed) {
      onSessionExpired?.();
      throw ApiError.fromResponse(401, await safeJson(response));
    }
    return send<T>(path, options, true);
  }

  return parse<T>(response);
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// --- API publica del cliente -------------------------------------------------

/** Peticion que devuelve el contenido de `data`. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const result = await send<T>(path, options, false);
  return result.data;
}

/** Peticion a un listado paginado: devuelve `data` y `meta` juntos. */
export async function apiRequestPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T[]; meta: PageMeta }> {
  const result = await send<T[]>(path, options, false);
  return {
    data: result.data ?? [],
    meta: result.meta ?? { total: 0, page: 1, pageSize: 20, totalPages: 0 },
  };
}

export const api = {
  get: <T>(path: string, query?: QueryParams) => apiRequest<T>(path, { method: 'GET', query }),
  list: <T>(path: string, query?: QueryParams) => apiRequestPaginated<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T = void>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
