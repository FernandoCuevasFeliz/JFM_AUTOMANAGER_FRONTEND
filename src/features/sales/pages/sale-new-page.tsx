import { PageHeader } from '@/components/page-header';
import { SaleForm } from '../components/sale-form';

export function SaleNewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nueva venta"
        description="Al guardar, el vehiculo pasa a vendido y la reserva y la cotizacion de origen quedan convertidas."
        backTo="/sales"
        backLabel="Ventas"
      />
      <SaleForm />
    </div>
  );
}
