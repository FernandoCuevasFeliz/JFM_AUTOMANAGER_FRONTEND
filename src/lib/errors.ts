import type { FieldValues, UseFormSetError, Path } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError, isApiError } from './api-error';

/**
 * Unico sitio donde se decide que hace la UI ante cada `error.code`.
 *
 * La tabla de §1 de API.md se traduce aqui a un comportamiento concreto; los
 * modulos llaman a `handleApiError` y no repiten el switch.
 */

export { ApiError, isApiError };

/** Quita el prefijo de origen (`body.`, `query.`, `params.`) del path. */
export function stripPathPrefix(path: string): string {
  return path.replace(/^(body|query|params)\./, '');
}

/**
 * Vuelca los `details` de un `VALIDATION_ERROR` en el formulario.
 *
 * Devuelve `true` si consiguio asignar al menos un campo: en ese caso no hace
 * falta un toast, el usuario ya ve el error donde lo cometio.
 */
export function applyValidationErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields?: readonly string[],
): boolean {
  if (!isApiError(error)) return false;

  if (error.code === 'VALIDATION_ERROR') {
    const details = error.validationDetails;
    let applied = false;

    for (const detail of details) {
      const field = stripPathPrefix(detail.path);
      if (knownFields && !knownFields.includes(field)) continue;
      setError(field as Path<T>, { type: 'server', message: detail.message });
      applied = true;
    }

    return applied;
  }

  // Un conflicto de unicidad se pinta sobre el campo duplicado.
  if (error.code === 'CONFLICT') {
    const field = error.conflictField;
    if (field && (!knownFields || knownFields.includes(field))) {
      setError(field as Path<T>, { type: 'server', message: error.message });
      return true;
    }
  }

  return false;
}

export interface HandleErrorOptions {
  /** Texto que precede al mensaje del servidor en el toast. */
  title?: string;
  /** Silencia el toast (por ejemplo, si ya se pinto en el formulario). */
  silent?: boolean;
}

/**
 * Traduce cualquier error a la reaccion de UI que le corresponde.
 *
 * El 401 no se toca aqui: lo resuelve el interceptor del cliente HTTP, que
 * refresca o cierra la sesion antes de que el error llegue a este punto.
 */
export function handleApiError(error: unknown, options: HandleErrorOptions = {}): void {
  if (options.silent) return;

  if (!isApiError(error)) {
    toast.error(options.title ?? 'Ocurrio un error inesperado', {
      description: error instanceof Error ? error.message : undefined,
    });
    return;
  }

  const description = error.message;

  switch (error.code) {
    case 'VALIDATION_ERROR': {
      // Si llega hasta aqui es que no habia formulario donde pintarlo.
      const details = error.validationDetails;
      toast.error(options.title ?? 'Revisa los datos enviados', {
        description:
          details.length > 0
            ? details.map((d) => `${stripPathPrefix(d.path)}: ${d.message}`).join(' · ')
            : description,
      });
      return;
    }

    case 'FORBIDDEN':
      // Puede pasar aunque ocultemos la accion: los permisos cambiaron y la
      // sesion todavia no se ha refrescado.
      toast.error('No tienes permiso para esta accion', {
        description: 'Si crees que deberias tenerlo, vuelve a iniciar sesion.',
      });
      return;

    case 'NOT_FOUND':
      toast.error('No encontrado', { description });
      return;

    case 'CONFLICT':
      toast.error(options.title ?? 'Valor duplicado', { description });
      return;

    case 'BUSINESS_RULE_VIOLATION':
      // El mensaje del backend suele explicar exactamente que hacer.
      toast.error(options.title ?? 'Operacion no permitida', { description });
      return;

    case 'INVALID_REFERENCE':
      toast.error('Referencia invalida', {
        description: `${description} Recarga la pagina para actualizar los catalogos.`,
      });
      return;

    case 'NETWORK_ERROR':
      toast.error('Sin conexion con el servidor', { description });
      return;

    case 'UNAUTHORIZED':
      toast.error('Sesion expirada', { description: 'Vuelve a iniciar sesion.' });
      return;

    default:
      toast.error(options.title ?? 'Error del servidor', { description });
  }
}

/**
 * Combina las dos rutas anteriores: intenta pintar en el formulario y, si no
 * hay campo al que atribuir el error, cae al toast.
 */
export function handleFormError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options: HandleErrorOptions & { knownFields?: readonly string[] } = {},
): void {
  const applied = applyValidationErrors(error, setError, options.knownFields);
  handleApiError(error, { ...options, silent: applied });
}
