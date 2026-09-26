import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { VehicleForm } from '../components/vehicle-form';
import { useVehicle } from '../hooks';

export function VehicleEditPage() {
  const { id } = useParams<{ id: string }>();
  const vehicleQuery = useVehicle(id);

  if (vehicleQuery.isLoading) return <DetailSkeleton />;

  if (vehicleQuery.isError || !vehicleQuery.data) {
    return <ErrorState error={vehicleQuery.error} onRetry={() => void vehicleQuery.refetch()} />;
  }

  const vehicle = vehicleQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${vehicle.brandName} ${vehicle.modelName}`}
        description={`Editando la unidad ${vehicle.chassisNumber}. El estado se cambia desde la ficha.`}
        backTo={`/vehicles/${vehicle.id}`}
        backLabel="Ficha del vehiculo"
      />
      <VehicleForm vehicle={vehicle} />
    </div>
  );
}
