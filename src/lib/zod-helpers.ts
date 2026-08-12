import { z } from 'zod';

/**
 * Piezas compartidas por los esquemas de formulario.
 *
 * Son el espejo de `presentation/http/shared/common.schemas.ts` del backend,
 * mas la conversion que hace falta en el navegador: los `<input>` siempre
 * entregan string, y el backend distingue `""` de `null` de "campo ausente".
 */

/** Texto opcional: un campo vacio viaja como `null`, no como `""`. */
export const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No puede superar los ${max} caracteres`)
    .nullable()
    .optional()
    .transform((value) => (value === undefined || value === '' ? null : value));

export const requiredText = (max: number, field = 'El campo') =>
  z
    .string()
    .trim()
    .min(1, `${field} es obligatorio`)
    .max(max, `No puede superar los ${max} caracteres`);

export const uuid = z.string().uuid('Identificador invalido');

/** Selector obligatorio: `""` es "sin elegir", y debe fallar como tal. */
export const requiredSelect = (message = 'Selecciona una opcion') =>
  z.string().min(1, message).uuid(message);

/** Fecha civil `YYYY-MM-DD`. Nunca se convierte a `Date`. */
export const civilDate = z
  .string()
  .min(1, 'La fecha es obligatoria')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato YYYY-MM-DD');

/** Convierte lo que entrega un `<input type="number">` en numero o `null`. */
const toNullableNumber = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const toNumber = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

/** Monto NUMERIC(12,2) no negativo. */
export const money = z.preprocess(
  toNumber,
  z
    .number({ invalid_type_error: 'Debe ser un numero', required_error: 'El monto es obligatorio' })
    .finite('El monto no es un numero valido')
    .nonnegative('El monto no puede ser negativo')
    .max(9_999_999_999.99, 'El monto excede el maximo permitido'),
);

/** Monto que ademas debe ser mayor que cero (CHECK de la base). */
export const positiveMoney = z.preprocess(
  toNumber,
  z
    .number({ invalid_type_error: 'Debe ser un numero', required_error: 'El monto es obligatorio' })
    .finite('El monto no es un numero valido')
    .gt(0, 'El monto debe ser mayor que cero')
    .max(9_999_999_999.99, 'El monto excede el maximo permitido'),
);

export const nullableMoney = z.preprocess(
  toNullableNumber,
  z
    .number({ invalid_type_error: 'Debe ser un numero' })
    .finite('El monto no es un numero valido')
    .nonnegative('El monto no puede ser negativo')
    .max(9_999_999_999.99, 'El monto excede el maximo permitido')
    .nullable(),
);

/** Tasa de cambio NUMERIC(10,4), siempre mayor que cero. */
export const exchangeRate = z.preprocess(
  toNumber,
  z
    .number({ invalid_type_error: 'Debe ser un numero', required_error: 'La tasa es obligatoria' })
    .gt(0, 'La tasa de cambio debe ser mayor que cero')
    .max(999_999.9999, 'La tasa de cambio excede el maximo permitido'),
);

export const nullableInteger = (options: { min?: number; message?: string } = {}) =>
  z.preprocess(
    toNullableNumber,
    z
      .number({ invalid_type_error: 'Debe ser un numero' })
      .int('Debe ser un numero entero')
      .min(options.min ?? 0, options.message ?? 'No puede ser negativo')
      .nullable(),
  );

/**
 * Solo lo que cambio.
 *
 * Un `PATCH` distingue campo ausente (no se toca) de `null` (se borra), asi que
 * al editar se envia unicamente la diferencia respecto al valor original.
 */
export function diffPayload<T extends Record<string, unknown>>(
  original: Partial<T>,
  next: T,
): Partial<T> {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(next)) {
    const previous = original[key as keyof T];
    // `null` y `undefined` describen lo mismo en el formulario ("vacio"), pero
    // no en la API: si ambos lados estan vacios, el campo no se toca.
    const bothEmpty =
      (previous === null || previous === undefined) && (value === null || value === undefined);

    if (!bothEmpty && previous !== value) {
      payload[key] = value;
    }
  }

  return payload as Partial<T>;
}

export function isEmptyPayload(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).length === 0;
}
