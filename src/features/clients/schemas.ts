import { z } from 'zod';
import { nullableText, requiredSelect, requiredText } from '@/lib/zod-helpers';

/**
 * Espejo de `clients.schemas.ts` mas la regla de identidad de §7 de API.md,
 * que en el backend vive en el dominio (`client.entity.ts`), no en Zod:
 *
 *   individual → firstName y lastName obligatorios
 *   company    → companyName obligatorio
 *
 * Se replica aqui para avisar antes de enviar y para que el formulario sepa que
 * campos marcar como requeridos al alternar el tipo.
 */
export const clientFormSchema = z
  .object({
    clientType: z.enum(['individual', 'company']),
    documentTypeId: requiredSelect('Selecciona el tipo de documento'),
    documentNumber: requiredText(30, 'El numero de documento'),
    firstName: nullableText(100),
    lastName: nullableText(100),
    companyName: nullableText(150),
    email: z
      .union([z.string().trim().email('El correo no es valido').max(150), z.literal('')])
      .nullable()
      .optional()
      .transform((value) => (value === '' || value === undefined ? null : value)),
    // El backend lo exige (`requiredString(30)`), aunque algun ejemplo de
    // API.md lo omita: manda el schema.
    phone: requiredText(30, 'El telefono'),
    address: nullableText(255),
    city: nullableText(100),
    isActive: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.clientType === 'individual') {
      if (!value.firstName) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['firstName'],
          message: 'El nombre es obligatorio para una persona fisica',
        });
      }
      if (!value.lastName) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lastName'],
          message: 'El apellido es obligatorio para una persona fisica',
        });
      }
      return;
    }

    if (!value.companyName) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyName'],
        message: 'La razon social es obligatoria para una empresa',
      });
    }
  });

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export const CLIENT_FORM_FIELDS = [
  'clientType',
  'documentTypeId',
  'documentNumber',
  'firstName',
  'lastName',
  'companyName',
  'email',
  'phone',
  'address',
  'city',
  'isActive',
] as const;
