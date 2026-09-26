/**
 * Formas de respuesta comunes a toda la API (ver §1 de API.md).
 *
 * Nada llega en la raiz: siempre viene envuelto en `data`, y los listados
 * ademas traen `meta` con la paginacion del servidor.
 */

export interface PageMeta {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

export interface Paginated<T> {
  readonly data: T[];
  readonly meta: PageMeta;
}

/** Query de paginacion aceptada por todos los listados. */
export interface PageQuery {
  page?: number;
  pageSize?: number;
}

/** Codigos de error estables del backend. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'MALFORMED_JSON'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ROUTE_NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE_VIOLATION'
  | 'INVALID_REFERENCE'
  | 'INTERNAL_ERROR'
  /** No es del backend: lo genera el cliente cuando la peticion ni siquiera sale. */
  | 'NETWORK_ERROR';

/** Un error por campo dentro de `VALIDATION_ERROR`. */
export interface ValidationDetail {
  readonly path: string;
  readonly message: string;
}

/** `details` de `CONFLICT`: indica que campo choca. */
export interface ConflictDetails {
  readonly field?: string;
  readonly [key: string]: unknown;
}

/** `details` de una transicion de estado invalida. */
export interface TransitionDetails {
  readonly from?: string;
  readonly to?: string;
  readonly allowed?: string[];
  readonly [key: string]: unknown;
}

export type ApiErrorDetails = ValidationDetail[] | ConflictDetails | TransitionDetails | undefined;

/** Valores admitidos en la query string; los `undefined` se descartan. */
export type QueryValue = string | number | boolean | undefined | null | (string | number)[];
export type QueryParams = Record<string, QueryValue>;
