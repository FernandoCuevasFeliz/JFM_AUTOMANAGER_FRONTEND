export type { SessionPayload, SessionUser } from '@/lib/api-client';

/** Sesion abierta del propio usuario (`GET /auth/sessions`). */
export interface AuthSession {
  readonly id: string;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface LogoutAllResult {
  readonly revoked: number;
}
