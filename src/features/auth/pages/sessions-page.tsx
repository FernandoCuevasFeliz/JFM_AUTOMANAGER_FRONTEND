import { useMutation, useQuery } from '@tanstack/react-query';
import { LogOut, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useManagedSessions, useRevokeSession, useRevokeUserSessions } from '@/features/users/hooks';
import type { ManagedSession } from '@/features/users/types';
import { formatDateTime } from '@/lib/dates';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { authApi } from '../api';
import type { AuthSession } from '../types';
import { useAuth } from '../use-auth';

type RevokeTarget =
  | { kind: 'session'; session: ManagedSession }
  | { kind: 'user'; session: ManagedSession };

export function SessionsPage() {
  const navigate = useNavigate();
  const { can, endSession, user } = useAuth();
  const isAdministrator = can('users:read');
  const canRevokeOthers = can('users:write');
  const [ownConfirmOpen, setOwnConfirmOpen] = React.useState(false);
  const [target, setTarget] = React.useState<RevokeTarget | null>(null);

  const ownSessionsQuery = useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => authApi.sessions(),
    enabled: !isAdministrator,
  });
  const managedSessionsQuery = useManagedSessions();
  const revokeSession = useRevokeSession();
  const revokeUserSessions = useRevokeUserSessions();

  const logoutAll = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: (result) => {
      toast.success(`Se cerraron ${result.revoked} de tus sesiones`, {
        description: 'Inicia sesion de nuevo.',
      });
      endSession();
      navigate('/login', { replace: true });
    },
    onError: (error) => handleApiError(error, { title: 'No se pudieron cerrar las sesiones' }),
  });

  const ownSessions = ownSessionsQuery.data ?? [];
  const managedSessions = managedSessionsQuery.data ?? [];
  const query = isAdministrator ? managedSessionsQuery : ownSessionsQuery;

  function confirmManagedRevoke() {
    if (!target) return;
    const mutation = target.kind === 'session' ? revokeSession : revokeUserSessions;
    const value = target.kind === 'session' ? target.session.id : target.session.userId;
    mutation.mutate(value, {
      onSuccess: () => {
        if (target.session.userId === user?.id && target.kind === 'user') {
          endSession();
          navigate('/login', { replace: true });
        }
      },
      onSettled: () => setTarget(null),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={isAdministrator ? 'Administracion' : 'Mi cuenta'}
        title={isAdministrator ? 'Sesiones activas' : 'Mis sesiones activas'}
        description={isAdministrator
          ? 'Dispositivos conectados, identificados por usuario.'
          : `Dispositivos donde ${user?.email ?? 'tu usuario'} tiene la sesion abierta.`}
        backTo="/"
        backLabel="Volver al tablero"
        actions={!isAdministrator && ownSessions.length > 0 && (
          <Button variant="outline" onClick={() => setOwnConfirmOpen(true)}>
            <LogOut aria-hidden />Cerrar mis sesiones
          </Button>
        )}
      />

      <p className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/50 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{isAdministrator
          ? 'Cada cierre exige confirmacion y muestra el usuario afectado. La sesion no podra renovarse.'
          : 'Aqui solo aparecen tus sesiones. Los demas usuarios no pueden verlas ni cerrarlas.'}</span>
      </p>

      <Card><CardContent className="px-0 pt-6">
        {query.isLoading ? <TableSkeleton rows={4} columns={isAdministrator ? 6 : 4} /> : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (isAdministrator ? managedSessions.length : ownSessions.length) === 0 ? (
          <EmptyState icon={MonitorSmartphone} title="Sin sesiones registradas" description="No hay sesiones vigentes." />
        ) : isAdministrator ? (
          <ManagedSessionsTable sessions={managedSessions} canRevoke={canRevokeOthers} onRevoke={setTarget} />
        ) : <OwnSessionsTable sessions={ownSessions} />}
      </CardContent></Card>

      <ConfirmDialog
        open={ownConfirmOpen}
        onOpenChange={setOwnConfirmOpen}
        title="Cerrar todas mis sesiones"
        description="Se cerraran todas las sesiones de tu cuenta, incluida esta. Tendras que iniciar sesion de nuevo."
        confirmLabel="Cerrar mis sesiones"
        destructive
        loading={logoutAll.isPending}
        onConfirm={() => logoutAll.mutate()}
      />

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target?.kind === 'user' ? 'Cerrar todas las sesiones del usuario' : 'Cerrar sesion'}
        description={target && <span>
          {target.kind === 'user' ? 'Se cerraran todas las sesiones de ' : 'Se cerrara esta sesion de '}
          <strong className="font-semibold text-foreground">{target.session.userName}</strong>
          {' '}({target.session.userEmail}). No podra renovarla.
        </span>}
        confirmLabel={target?.kind === 'user' ? 'Cerrar todas' : 'Cerrar sesion'}
        destructive
        loading={revokeSession.isPending || revokeUserSessions.isPending}
        onConfirm={confirmManagedRevoke}
      />
    </div>
  );
}

function ManagedSessionsTable({ sessions, canRevoke, onRevoke }: {
  sessions: ManagedSession[];
  canRevoke: boolean;
  onRevoke: (target: RevokeTarget) => void;
}) {
  return <Table>
    <TableHeader><TableRow className="hover:bg-transparent">
      <TableHead>Usuario</TableHead><TableHead>Dispositivo</TableHead><TableHead>IP</TableHead>
      <TableHead>Iniciada</TableHead><TableHead>Expira</TableHead><TableHead />
    </TableRow></TableHeader>
    <TableBody>{sessions.map((session) => <TableRow key={session.id}>
      <TableCell><span className="block font-medium">{session.userName}</span><span className="text-xs text-muted-foreground">{session.userEmail}</span></TableCell>
      <TableCell className="max-w-xs"><span className="block truncate text-sm">{session.userAgent ?? 'Desconocido'}</span>{session.userAgent === navigator.userAgent && <Badge variant="blue" className="mt-1">Este navegador</Badge>}</TableCell>
      <TableCell className="text-muted-foreground">{session.ipAddress ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(session.createdAt)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(session.expiresAt)}</TableCell>
      <TableCell>{canRevoke && <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => onRevoke({ kind: 'session', session })}><LogOut aria-hidden />Cerrar</Button>
        <Button size="sm" variant="destructive" onClick={() => onRevoke({ kind: 'user', session })}>Cerrar todas</Button>
      </div>}</TableCell>
    </TableRow>)}</TableBody>
  </Table>;
}

function OwnSessionsTable({ sessions }: { sessions: AuthSession[] }) {
  return <Table>
    <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Dispositivo</TableHead><TableHead>Direccion IP</TableHead><TableHead>Iniciada</TableHead><TableHead>Expira</TableHead></TableRow></TableHeader>
    <TableBody>{sessions.map((session) => <TableRow key={session.id}>
      <TableCell className="max-w-md"><span className="block truncate text-sm">{session.userAgent ?? 'Desconocido'}</span>{session.userAgent === navigator.userAgent && <Badge variant="blue" className="mt-1">Este navegador</Badge>}</TableCell>
      <TableCell className="text-muted-foreground">{session.ipAddress ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(session.createdAt)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(session.expiresAt)}</TableCell>
    </TableRow>)}</TableBody>
  </Table>;
}
