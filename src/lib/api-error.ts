import type { ApiErrorCode, ApiErrorDetails, ConflictDetails, TransitionDetails, ValidationDetail } from './api-types';

/**
 * Error normalizado de la API.
 *
 * El backend contesta `{ error: { code, message, details } }` con `message` ya
 * redactado en espanol y apto para mostrarse tal cual. Se reacciona siempre
 * sobre `code`, que es estable, nunca sobre el texto.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: ApiErrorDetails;

  constructor(code: ApiErrorCode, message: string, status: number, details?: ApiErrorDetails) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Construye el error a partir del cuerpo de una respuesta fallida. */
  static fromResponse(status: number, body: unknown): ApiError {
    const payload =
      typeof body === 'object' && body !== null && 'error' in body
        ? (body as { error?: { code?: string; message?: string; details?: ApiErrorDetails } }).error
        : undefined;

    return new ApiError(
      (payload?.code as ApiErrorCode) ?? fallbackCodeFor(status),
      payload?.message ?? 'Ocurrio un error inesperado. Intentalo de nuevo.',
      status,
      payload?.details,
    );
  }

  static network(): ApiError {
    return new ApiError(
      'NETWORK_ERROR',
      'No se pudo conectar con el servidor. Revisa tu conexion e intentalo de nuevo.',
      0,
    );
  }

  /** `details` de un `VALIDATION_ERROR`, ya como array. */
  get validationDetails(): ValidationDetail[] {
    return Array.isArray(this.details) ? this.details : [];
  }

  /** Campo que provoco un `CONFLICT`, si el backend lo indico. */
  get conflictField(): string | undefined {
    if (!this.details || Array.isArray(this.details)) return undefined;
    const field = (this.details as ConflictDetails).field;
    return typeof field === 'string' ? field : undefined;
  }

  /** Transiciones permitidas que acompanan a un 422 de maquina de estados. */
  get allowedTransitions(): string[] {
    if (!this.details || Array.isArray(this.details)) return [];
    const allowed = (this.details as TransitionDetails).allowed;
    return Array.isArray(allowed) ? allowed : [];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function fallbackCodeFor(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'BUSINESS_RULE_VIOLATION';
    default:
      return 'INTERNAL_ERROR';
  }
}
