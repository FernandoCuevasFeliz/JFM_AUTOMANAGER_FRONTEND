import { PageHeader } from '@/components/page-header';
import { VehicleForm } from '../components/vehicle-form';

export function VehicleNewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuevo vehiculo"
        description="Registra una unidad en el inventario. Las imagenes se agregan despues, desde su ficha."
        backTo="/vehicles"
        backLabel="Vehiculos"
      />
      <VehicleForm />
    </div>
  );
}
