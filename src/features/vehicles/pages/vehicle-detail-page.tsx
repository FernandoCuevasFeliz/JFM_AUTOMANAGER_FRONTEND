import { Pencil, RefreshCcw, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/use-auth';
import { VehicleCostPanel } from '@/features/expenses/components/vehicle-cost-panel';
import { formatDateTime } from '@/lib/dates';
import { formatMoney, formatNumber } from '@/lib/money';
import { isCommerciallyManagedStatus } from '@/lib/status';
import { VehicleImagesUploader } from '../components/vehicle-images-uploader';
import { VehicleStatusBadge } from '../components/vehicle-status-badge';
import { VehicleStatusDialog } from '../components/vehicle-status-dialog';
import { useDeleteVehicle, useVehicle } from '../hooks';

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();

  const vehicleQuery = useVehicle(id);
  const deleteVehicle = useDeleteVehicle();

  const [statusOpen, setStatusOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // `?tab=imagenes` permite enlazar directo a la galeria; es como llega el
  // formulario despues de registrar un vehiculo nuevo.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'ficha';

  if (vehicleQuery.isLoading) return <DetailSkeleton />;

  if (vehicleQuery.isError || !vehicleQuery.data) {
    return <ErrorState error={vehicleQuery.error} onRetry={() => void vehicleQuery.refetch()} />;
  }

  const vehicle = vehicleQuery.data;
  const canWrite = can('vehicles:write');
  const commerciallyManaged = isCommerciallyManagedStatus(vehicle.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${vehicle.brandName} ${vehicle.modelName} ${vehicle.year}`}
        description={`Chasis ${vehicle.chassisNumber}`}
        backTo="/vehicles"
        backLabel="Vehiculos"
        actions={
          <>
            {can('vehicles:change-status') && !commerciallyManaged && (
              <Button variant="outline" onClick={() => setStatusOpen(true)}>
                <RefreshCcw />
                Cambiar estado
              </Button>
            )}
            {canWrite && (
              <Button variant="outline" asChild>
                <Link to={`/vehicles/${vehicle.id}/edit`}>
                  <Pencil />
                  Editar
                </Link>
              </Button>
            )}
            {/* Un vehiculo reservado o vendido no se puede borrar (§7). */}
            {can('vehicles:delete') && !commerciallyManaged && (
              <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Eliminar
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <VehicleStatusBadge status={vehicle.status} />
        {!vehicle.isActive && (
          <span className="text-xs text-muted-foreground">Marcado como inactivo</span>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setSearchParams(value === 'ficha' ? {} : { tab: value }, { replace: true })
        }
      >
        <TabsList>
          <TabsTrigger value="ficha">Ficha</TabsTrigger>
          <TabsTrigger value="imagenes">Imagenes</TabsTrigger>
          {can('reports:read') && <TabsTrigger value="costos">Costo y margen</TabsTrigger>}
        </TabsList>

        <TabsContent value="ficha">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Datos de la unidad</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  <DetailItem label="Marca" value={vehicle.brandName} />
                  <DetailItem label="Modelo" value={vehicle.modelName} />
                  <DetailItem label="Ano" value={String(vehicle.year)} />
                  <DetailItem label="Numero de chasis" value={vehicle.chassisNumber} mono />
                  <DetailItem label="Numero de motor" value={vehicle.engineNumber} mono />
                  <DetailItem label="Color" value={vehicle.color} />
                  <DetailItem
                    label="Kilometraje"
                    value={vehicle.mileage === null ? null : `${formatNumber(vehicle.mileage)} km`}
                  />
                  <DetailItem label="Transmision" value={vehicle.transmissionType} capitalize />
                  <DetailItem label="Combustible" value={vehicle.fuelType} capitalize />
                  <DetailItem
                    label="Precio de lista"
                    value={vehicle.salePrice === null ? null : formatMoney(vehicle.salePrice, 'DOP')}
                  />
                </dl>

                {vehicle.notes && (
                  <div className="mt-6 border-t border-border pt-4">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Notas
                    </dt>
                    <dd className="mt-1.5 whitespace-pre-wrap text-sm">{vehicle.notes}</dd>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registro</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-4">
                  <DetailItem label="Creado" value={formatDateTime(vehicle.createdAt)} />
                  <DetailItem label="Ultima actualizacion" value={formatDateTime(vehicle.updatedAt)} />
                  <DetailItem label="Imagenes" value={String(vehicle.images?.length ?? 0)} />
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="imagenes">
          <Card>
            <CardHeader>
              <CardTitle>Galeria</CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleImagesUploader vehicleId={vehicle.id} canEdit={canWrite} />
            </CardContent>
          </Card>
        </TabsContent>

        {can('reports:read') && (
          <TabsContent value="costos">
            <VehicleCostPanel vehicleId={vehicle.id} />
          </TabsContent>
        )}
      </Tabs>

      <VehicleStatusDialog vehicle={vehicle} open={statusOpen} onOpenChange={setStatusOpen} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar vehiculo"
        description={
          <>
            Se eliminara <strong>{vehicle.chassisNumber}</strong>. El borrado es logico: la unidad
            desaparece de los listados pero conserva su historia.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        loading={deleteVehicle.isPending}
        onConfirm={() =>
          deleteVehicle.mutate(vehicle.id, {
            onSuccess: () => navigate('/vehicles', { replace: true }),
          })
        }
      />
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
  capitalize = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={[
          'text-sm',
          mono ? 'font-mono text-[13px]' : '',
          capitalize ? 'capitalize' : '',
        ].join(' ')}
      >
        {value ?? '—'}
      </dd>
    </div>
  );
}
