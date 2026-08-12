import { useMutation, useQuery } from '@tanstack/react-query';
import { LogOut, MonitorSmartphone } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/dates';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { authApi } from '../api';
import { useAuth } from '../use-auth';

/**
 * Sesiones abiertas del propio usuario.
 *
 * `logout-all` cierra tambien la sesion actual, asi que despues hay que limpiar
 * el almacenamiento local y volver al login.
 */
export function SessionsPage() {
  const navigate = useNavigate();
  const { endSession } = useAuth();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => authApi.sessions(),
  });

  const logoutAll = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: (result) => {
      toast.success(`Se cerraron ${result.revoked} sesion(es)`, {
        description: 'Incluida la actual. Inicia sesion de nuevo.',
      });
      endSession();
      navigate('/login', { replace: true });
    },
    onError: (error) => handleApiError(error, { title: 'No se pudieron cerrar las sesiones' }),
  });

  const sessions = sessionsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sesiones activas"
        description="Dispositivos con la sesion abierta en tu cuenta."
        backTo="/"
        backLabel="Volver al tablero"
        actions={
          sessions.length > 0 && (
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              <LogOut />
              Cerrar todas
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="px-0 pt-6">
          {sessionsQuery.isLoading ? (
            <TableSkeleton rows={3} columns={3} />
          ) : sessionsQuery.isError ? (
            <ErrorState error={sessionsQuery.error} onRetry={() => void sessionsQuery.refetch()} />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={MonitorSmartphone}
              title="Sin sesiones registradas"
              description="No hay refresh tokens vigentes para tu cuenta."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Direccion IP</TableHead>
                  <TableHead>Iniciada</TableHead>
                  <TableHead>Expira</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="max-w-md truncate text-sm">
                      {session.userAgent ?? 'Desconocido'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {session.ipAddress ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(session.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(session.expiresAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cerrar todas las sesiones"
        description="Se revocaran todos los refresh tokens de tu cuenta, incluido el de este dispositivo. Tendras que iniciar sesion de nuevo."
        confirmLabel="Cerrar todas"
        destructive
        loading={logoutAll.isPending}
        onConfirm={() => logoutAll.mutate()}
      />
    </div>
  );
}
