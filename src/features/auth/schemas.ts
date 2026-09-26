import { z } from 'zod';

/**
 * Espejo de `users.schemas.ts` del backend en lo que toca a la sesion.
 *
 * La politica de contrasena (8–72, al menos una letra y un numero) se replica
 * para avisar antes de enviar; el servidor la vuelve a validar igual.
 */

const password = z
  .string()
  .min(8, 'La contrasena debe tener al menos 8 caracteres')
  .max(72, 'La contrasena no puede superar los 72 caracteres')
  .regex(/[A-Za-z]/, 'La contrasena debe incluir al menos una letra')
  .regex(/\d/, 'La contrasena debe incluir al menos un numero');

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'El correo es obligatorio').email('El correo no es valido'),
  password: z.string().min(1, 'La contrasena es obligatoria'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contrasena actual es obligatoria'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Confirma la nueva contrasena'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contrasenas no coinciden',
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
