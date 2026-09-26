import { Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DetailCard, DetailGrid, DetailItem } from '@/components/detail-view';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { usePurchases } from '@/features/purchases/hooks';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { PURCHASE_STATUS_META } from '@/lib/status';
import { SupplierFormDialog } from '../components/supplier-form-dialog';
import { useDeleteSupplier, useSupplier } from '../hooks';

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();

  const supplierQuery = useSupplier(id);
  const deleteSupplier = useDeleteSupplier();

  // Las compras del proveedor explican por que su borrado puede estar bloqueado.
  const purchasesQuery = usePurchases({ supplierId: id, pageSize: 5 });

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  if (supplierQuery.isLoading) return <DetailSkeleton />;

  if (supplierQuery.isError || !supplierQuery.data) {
    return <ErrorState error={supplierQuery.error} onRetry={() => void supplierQuery.refetch()} />;
  }

  const supplier = supplierQuery.data;
  const purchases = purchasesQuery.data?.data ?? [];
  const totalCompras = purchasesQuery.data?.meta?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Proveedor"
        title={supplier.name}
        description={supplier.country ?? undefined}
        backTo="/suppliers"
        backLabel="Proveedores"
        actions={
          <>
            {can('suppliers:write') && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil />
                Editar
              </Button>
            )}
            {can('suppliers:delete') && (
              <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Eliminar
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        {supplier.isActive ? (
          <Badge variant="green">Activo</Badge>
        ) : (
          <Badge variant="neutral">Inactivo</Badge>
        )}
        {totalCompras > 0 && (
          <span className="text-sm text-muted-foreground">
            {totalCompras} {totalCompras === 1 ? 'compra registrada' : 'compras registradas'}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DetailCard title="Datos de contacto" className="lg:col-span-2">
          <DetailGrid>
            <DetailItem label="Razon social" value={supplier.name} />
            <DetailItem label="Contacto" value={supplier.contactName} />
            <DetailItem label="Documento / RNC" value={supplier.documentNumber} numeric />
            <DetailItem label="Telefono" value={supplier.phone} numeric />
            <DetailItem label="Correo">
              {supplier.email ? (
                <a
                  href={`mailto:${supplier.email}`}
                  className="underline-offset-4 hover:underline"
                >
                  {supplier.email}
                </a>
              ) : null}
            </DetailItem>
            <DetailItem label="Pais" value={supplier.country} />
            <DetailItem label="Direccion" value={supplier.address} className="sm:col-span-2" />
            <DetailItem label="Alta" value={formatDateTime(supplier.createdAt)} numeric />
            <DetailItem
              label="Ultima actualizacion"
              value={formatDateTime(supplier.updatedAt)}
              numeric
            />
          </DetailGrid>
        </DetailCard>

        <DetailCard
          title="Ultimas compras"
          actions={
            totalCompras > 0 && can('purchases:read') ? (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/purchases">Ver todas</Link>
              </Button>
            ) : undefined
          }
        >
          {!can('purchases:read') ? (
            <p className="text-[13px] text-muted-foreground">
              Tu usuario no tiene acceso a las compras.
            </p>
          ) : purchases.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Sin compras registradas a este proveedor.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {purchases.map((purchase) => (
                <li key={purchase.id}>
                  <Link
                    to={`/purchases/${purchase.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-foreground"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="num text-sm">{purchase.purchaseNumber}</span>
                      <span className="text-xs text-muted-foreground">
                        {PURCHASE_STATUS_META[purchase.status].label}
                      </span>
                    </span>
                    <span className="num shrink-0 text-sm">
                      {formatMoney(purchase.totalCost, purchase.currencyCode)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>

      <SupplierFormDialog supplier={supplier} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Eliminar ${supplier.name}`}
        description={
          totalCompras > 0
            ? 'Este proveedor tiene compras registradas, asi que el servidor bloqueara el borrado. Desactivalo desde «Editar» si ya no operas con el.'
            : 'El proveedor deja de aparecer en los listados. Su historial se conserva.'
        }
        confirmLabel="Eliminar"
        destructive
        loading={deleteSupplier.isPending}
        onConfirm={() => {
          deleteSupplier.mutate(supplier.id, { onSuccess: () => navigate('/suppliers') });
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}
