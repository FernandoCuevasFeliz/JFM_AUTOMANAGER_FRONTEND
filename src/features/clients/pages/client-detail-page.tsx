import { BadgeDollarSign, BookMarked, FileText, Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DetailCard, DetailGrid, DetailItem } from '@/components/detail-view';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { useQuotations } from '@/features/quotations/hooks';
import { useReservations } from '@/features/reservations/hooks';
import { useSales } from '@/features/sales/hooks';
import { formatCivilDate, formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import {
  CLIENT_TYPE_META,
  QUOTATION_STATUS_META,
  RESERVATION_STATUS_META,
  SALE_STATUS_META,
} from '@/lib/status';
import { ClientFormDialog } from '../components/client-form-dialog';
import { useClient, useDeleteClient } from '../hooks';
import { clientDisplayName } from '../types';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();

  const clientQuery = useClient(id);
  const deleteClient = useDeleteClient();

  /*
   * El historial comercial del cliente no es decorativo: es lo que explica por
   * que el backend puede bloquear su borrado (§7 de API.md). Se piden pocas
   * filas de cada uno porque aqui solo interesa el resumen; el detalle vive en
   * su propio modulo.
   */
  const quotationsQuery = useQuotations({ clientId: id, pageSize: 5 });
  const reservationsQuery = useReservations({ clientId: id, pageSize: 5 });
  const salesQuery = useSales({ clientId: id, pageSize: 5 });

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  if (clientQuery.isLoading) return <DetailSkeleton />;

  if (clientQuery.isError || !clientQuery.data) {
    return <ErrorState error={clientQuery.error} onRetry={() => void clientQuery.refetch()} />;
  }

  const client = clientQuery.data;
  const nombre = clientDisplayName(client);

  const totalCotizaciones = quotationsQuery.data?.meta?.total ?? 0;
  const totalReservas = reservationsQuery.data?.meta?.total ?? 0;
  const totalVentas = salesQuery.data?.meta?.total ?? 0;
  const conHistorial = totalCotizaciones + totalReservas + totalVentas > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Cliente"
        title={nombre}
        description={
          client.documentNumber
            ? `${client.documentTypeName} ${client.documentNumber}`
            : undefined
        }
        backTo="/clients"
        backLabel="Clientes"
        actions={
          <>
            {can('clients:write') && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil />
                Editar
              </Button>
            )}
            {/*
              El backend bloquea el borrado si el cliente tiene documentos. El
              boton se queda visible y deshabilitado con el motivo: esconderlo
              haria pensar que la aplicacion no sabe borrar clientes.
            */}
            {can('clients:delete') && (
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                disabled={conHistorial}
                title={
                  conHistorial
                    ? 'No se puede eliminar: tiene cotizaciones, reservas o ventas. Desactivalo en su lugar.'
                    : undefined
                }
              >
                <Trash2 />
                Eliminar
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge meta={CLIENT_TYPE_META[client.clientType]} />
        {client.isActive ? (
          <Badge variant="green">Activo</Badge>
        ) : (
          <Badge variant="neutral">Inactivo</Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DetailCard title="Datos del cliente" className="lg:col-span-2">
          <DetailGrid>
            {client.clientType === 'company' ? (
              <DetailItem label="Razon social" value={client.companyName} className="sm:col-span-2" />
            ) : (
              <>
                <DetailItem label="Nombre" value={client.firstName} />
                <DetailItem label="Apellido" value={client.lastName} />
              </>
            )}

            <DetailItem label={client.documentTypeName} value={client.documentNumber} numeric />
            <DetailItem label="Telefono" value={client.phone} numeric />
            <DetailItem label="Correo">
              {client.email ? (
                <a href={`mailto:${client.email}`} className="underline-offset-4 hover:underline">
                  {client.email}
                </a>
              ) : null}
            </DetailItem>
            <DetailItem label="Ciudad" value={client.city} />
            <DetailItem label="Direccion" value={client.address} className="sm:col-span-2" />
            <DetailItem label="Alta" value={formatDateTime(client.createdAt)} numeric />
            <DetailItem
              label="Ultima actualizacion"
              value={formatDateTime(client.updatedAt)}
              numeric
            />
          </DetailGrid>
        </DetailCard>

        <DetailCard title="Resumen comercial">
          <dl className="flex flex-col divide-y divide-border">
            <SummaryRow
              icon={FileText}
              label="Cotizaciones"
              total={totalCotizaciones}
              visible={can('quotations:read')}
            />
            <SummaryRow
              icon={BookMarked}
              label="Reservas"
              total={totalReservas}
              visible={can('reservations:read')}
            />
            <SummaryRow
              icon={BadgeDollarSign}
              label="Ventas"
              total={totalVentas}
              visible={can('sales:read')}
            />
          </dl>
        </DetailCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {can('quotations:read') && (
          <RelatedCard title="Ultimas cotizaciones" total={totalCotizaciones} to="/quotations">
            {(quotationsQuery.data?.data ?? []).map((quotation) => (
              <RelatedRow
                key={quotation.id}
                to={`/quotations/${quotation.id}`}
                code={quotation.quotationNumber}
                hint={QUOTATION_STATUS_META[quotation.status].label}
                amount={formatMoney(quotation.quotedPrice, quotation.currencyCode)}
              />
            ))}
          </RelatedCard>
        )}

        {can('reservations:read') && (
          <RelatedCard title="Ultimas reservas" total={totalReservas} to="/reservations">
            {(reservationsQuery.data?.data ?? []).map((reservation) => (
              <RelatedRow
                key={reservation.id}
                to={`/reservations/${reservation.id}`}
                code={reservation.reservationNumber}
                hint={RESERVATION_STATUS_META[reservation.status].label}
                amount={formatCivilDate(reservation.expirationDate)}
              />
            ))}
          </RelatedCard>
        )}

        {can('sales:read') && (
          <RelatedCard title="Ultimas ventas" total={totalVentas} to="/sales">
            {(salesQuery.data?.data ?? []).map((sale) => (
              <RelatedRow
                key={sale.id}
                to={`/sales/${sale.id}`}
                code={sale.saleNumber}
                hint={SALE_STATUS_META[sale.status].label}
                amount={formatMoney(sale.salePrice, sale.currencyCode)}
              />
            ))}
          </RelatedCard>
        )}
      </div>

      <ClientFormDialog client={client} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Eliminar a ${nombre}`}
        description="El cliente deja de aparecer en los listados. Su historial se conserva."
        confirmLabel="Eliminar"
        destructive
        loading={deleteClient.isPending}
        onConfirm={() => {
          deleteClient.mutate(client.id, { onSuccess: () => navigate('/clients') });
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  total,
  visible,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  total: number;
  visible: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </dt>
      <dd className="num text-sm font-medium">{visible ? total : '—'}</dd>
    </div>
  );
}

function RelatedCard({
  title,
  total,
  to,
  children,
}: {
  title: string;
  total: number;
  to: string;
  children: React.ReactNode;
}) {
  const rows = React.Children.toArray(children);

  return (
    <DetailCard
      title={title}
      actions={
        total > 0 ? (
          <Button variant="ghost" size="sm" asChild>
            <Link to={to}>Ver todas</Link>
          </Button>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Sin registros.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">{rows}</ul>
      )}
    </DetailCard>
  );
}

function RelatedRow({
  to,
  code,
  hint,
  amount,
}: {
  to: string;
  code: string;
  hint: string;
  amount: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center justify-between gap-3 py-2.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex min-w-0 flex-col">
          <span className="num text-sm text-foreground">{code}</span>
          <span className="text-xs">{hint}</span>
        </span>
        <span className="num shrink-0 text-sm">{amount}</span>
      </Link>
    </li>
  );
}
