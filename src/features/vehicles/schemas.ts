import { z } from 'zod';
import {
  nullableInteger,
  nullableMoney,
  nullableText,
  requiredSelect,
  requiredText,
} from '@/lib/zod-helpers';

/**
 * Espejo de `vehicles.schemas.ts` del backend.
 *
 * El chasis se normaliza a mayusculas igual que alli, para que lo que ve el
 * usuario coincida con lo que se guarda.
 */

const chassisNumber = z
  .string()
  .trim()
  .toUpperCase()
  .min(5, 'El numero de chasis es demasiado corto')
  .max(30, 'El numero de chasis no puede superar los 30 caracteres');

const year = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
  z
    .number({ invalid_type_error: 'El ano debe ser un numero', required_error: 'El ano es obligatorio' })
    .int('El ano debe ser un numero entero')
    .min(1900, 'El ano no puede ser anterior a 1900')
    .max(2100, 'El ano no puede ser posterior a 2100'),
);

/** El formulario no ofrece `reserved` ni `sold`: los fija el ciclo comercial. */
const assignableStatus = z.enum(['in_transit', 'in_inventory', 'in_repair', 'unavailable'], {
  required_error: 'Selecciona un estado',
});

export const vehicleFormSchema = z.object({
  brandId: requiredSelect('Selecciona una marca'),
  modelId: requiredSelect('Selecciona un modelo'),
  year,
  chassisNumber,
  color: nullableText(40),
  mileage: nullableInteger({ message: 'El kilometraje no puede ser negativo' }),
  engineNumber: nullableText(50),
  transmissionType: nullableText(20),
  fuelType: nullableText(20),
  salePrice: nullableMoney,
  notes: nullableText(5000),
  isActive: z.boolean(),
});

/** Al crear se elige ademas el estado inicial; al editar no (endpoint aparte). */
export const createVehicleSchema = vehicleFormSchema.extend({
  status: assignableStatus,
});

export const changeVehicleStatusSchema = z.object({ status: assignableStatus });

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
export type CreateVehicleFormValues = z.infer<typeof createVehicleSchema>;
export type CreateVehicleInput = CreateVehicleFormValues;
export type UpdateVehicleInput = Partial<VehicleFormValues>;

// --- Marcas y modelos --------------------------------------------------------

export const brandFormSchema = z.object({
  name: requiredText(80, 'El nombre de la marca'),
  isActive: z.boolean().optional(),
});

export const modelFormSchema = z.object({
  brandId: requiredSelect('Selecciona una marca'),
  name: requiredText(80, 'El nombre del modelo'),
  isActive: z.boolean().optional(),
});

export type BrandFormValues = z.infer<typeof brandFormSchema>;
export type ModelFormValues = z.infer<typeof modelFormSchema>;

/** Campos que el formulario de vehiculo sabe pintar (para mapear errores). */
export const VEHICLE_FORM_FIELDS = [
  'brandId',
  'modelId',
  'year',
  'chassisNumber',
  'color',
  'mileage',
  'engineNumber',
  'transmissionType',
  'fuelType',
  'salePrice',
  'status',
  'notes',
  'isActive',
] as const;
