import { z } from 'zod';
import { nullableText, requiredSelect, requiredText } from '@/lib/zod-helpers';

/**
 * Espejo de `users.schemas.ts`.
 *
 * Politica de contrasena: 8–72 caracteres, al menos una letra y un numero.
 */
const password = z
  .string()
  .min(8, 'La contrasena debe tener al menos 8 caracteres')
  .max(72, 'La contrasena no puede superar los 72 caracteres')
  .regex(/[A-Za-z]/, 'La contrasena debe incluir al menos una letra')
  .regex(/\d/, 'La contrasena debe incluir al menos un numero');

const email = z
  .string()
  .trim()
  .min(1, 'El correo es obligatorio')
  .email('El correo no es valido')
  .max(150);

export const createUserSchema = z.object({
  roleId: requiredSelect('Selecciona un rol'),
  firstName: requiredText(100, 'El nombre'),
  lastName: requiredText(100, 'El apellido'),
  email,
  password,
  phone: nullableText(30),
  isActive: z.boolean(),
});

/** Al editar no se toca la contrasena: tiene su propia accion. */
export const updateUserSchema = z.object({
  roleId: requiredSelect('Selecciona un rol'),
  firstName: requiredText(100, 'El nombre'),
  lastName: requiredText(100, 'El apellido'),
  email,
  phone: nullableText(30),
  isActive: z.boolean(),
});

export const resetPasswordSchema = z
  .object({
    newPassword: password,
    confirmPassword: z.string().min(1, 'Confirma la contrasena'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contrasenas no coinciden',
  });

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type UpdateUserValues = Partial<z.infer<typeof updateUserSchema>>;
export type UserFormValues = z.infer<typeof createUserSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const USER_FORM_FIELDS = [
  'roleId',
  'firstName',
  'lastName',
  'email',
  'password',
  'phone',
  'isActive',
] as const;
