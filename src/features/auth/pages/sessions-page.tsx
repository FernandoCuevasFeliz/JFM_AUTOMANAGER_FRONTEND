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
import { formatDateTime } from '@/lib/dates';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { authApi } from '../api';
import { useAuth } from '../use-auth';

/**
 * Sesiones abiertas **del propio usuario**.
 *
 * Ni este listado ni `logout-all` pueden tocar a nadie mas: los dos endpoints
 * trabajan sobre el `actorUserId` del token, asi que un usuario solo ve y cierra
 * lo suyo. La pantalla lo dice de forma explicita porque "Cerrar todas" sin mas
 * contexto se lee como si cerrara las sesiones de toda la empresa.
 *
 * `logout-all` cierra tambien la sesion actual, asi que despues hay que limpiar
 * el almacenamiento local y volver al login.
 */
export function SessionsPage() {
  const navigate = useNavigate();
  const { endSession, user } = useAuth();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => authApi.sessions(),
  });

  const logoutAll = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: (result) => {
      toast.success(`Se cerraron ${result.revoked} de tus sesiones`, {
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
        eyebrow="Mi cuenta"
        title="Mis sesiones activas"
        description={`Dispositivos donde ${user?.email ?? 'tu usuario'} tiene la sesion abierta.`}
        backTo="/"
        backLabel="Volver al tablero"
        actions={
          sessions.length > 0 && (
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              <LogOut />
              Cerrar mis sesiones
            </Button>
          )
        }
      />

      <p className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/50 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Aqui solo aparecen <strong className="font-medium text-foreground">tus</strong> sesiones.
          No puedes ver ni cerrar las de otros usuarios, y ellos tampoco las tuyas.
        </span>
      </p>

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
              description="No hay sesiones vigentes para tu cuenta."
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
                    <TableCell className="max-w-md text-sm">
                      <span className="block truncate">{session.userAgent ?? 'Desconocido'}</span>
                      {/*
                        Coincidencia por user agent: identifica el navegador, no la
                        sesion concreta. Por eso la etiqueta dice "este navegador"
                        y no "esta sesion" — si hay dos sesiones desde el mismo
                        Chrome, las dos se marcan, y seria falso decir otra cosa.
                      */}
                      {session.userAgent === navigator.userAgent && (
                        <Badge variant="blue" className="mt-1">
                          Este navegador
                        </Badge>
                      )}
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
        title="Cerrar todas mis sesiones"
        description="Se cerraran todas las sesiones de TU cuenta en todos tus dispositivos, incluida esta. Ningun otro usuario se ve afectado. Tendras que iniciar sesion de nuevo."
        confirmLabel="Cerrar mis sesiones"
        destructive
        loading={logoutAll.isPending}
        onConfirm={() => logoutAll.mutate()}
      />
    </div>
  );
}
