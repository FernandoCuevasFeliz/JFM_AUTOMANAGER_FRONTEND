import { z } from 'zod';
import { nullableText, requiredText } from '@/lib/zod-helpers';

/** Espejo de `suppliers.schemas.ts` del backend. */
export const supplierFormSchema = z.object({
  name: requiredText(150, 'El nombre del proveedor'),
  contactName: nullableText(100),
  documentNumber: nullableText(30),
  email: z
    .union([z.string().trim().email('El correo no es valido').max(150), z.literal('')])
    .nullable()
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value)),
  phone: nullableText(30),
  address: nullableText(255),
  country: nullableText(80),
  isActive: z.boolean(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export const SUPPLIER_FORM_FIELDS = [
  'name',
  'contactName',
  'documentNumber',
  'email',
  'phone',
  'address',
  'country',
  'isActive',
] as const;
