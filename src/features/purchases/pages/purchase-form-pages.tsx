import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, EmptyState, ErrorState } from '@/components/states';
import { isPurchaseEditable } from '@/lib/status';
import { PurchaseForm } from '../components/purchase-form';
import { usePurchase } from '../hooks';

export function PurchaseNewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nueva compra"
        description="El encabezado y las unidades se registran en una sola operacion."
        backTo="/purchases"
        backLabel="Compras"
      />
      <PurchaseForm />
    </div>
  );
}

export function PurchaseEditPage() {
  const { id } = useParams<{ id: string }>();
  const purchaseQuery = usePurchase(id);

  if (purchaseQuery.isLoading) return <DetailSkeleton />;

  if (purchaseQuery.isError || !purchaseQuery.data) {
    return <ErrorState error={purchaseQuery.error} onRetry={() => void purchaseQuery.refetch()} />;
  }

  const purchase = purchaseQuery.data;

  // Una compra cerrada no admite cambios: se evita el formulario, no solo el 422.
  if (!isPurchaseEditable(purchase.status)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={purchase.purchaseNumber}
          backTo={`/purchases/${purchase.id}`}
          backLabel="Detalle de la compra"
        />
        <EmptyState
          title="Esta compra ya no se puede editar"
          description="Solo se edita el encabezado mientras la compra esta pendiente o en transito."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Editar ${purchase.purchaseNumber}`}
        description="Solo se modifica el encabezado; las unidades no se pueden cambiar."
        backTo={`/purchases/${purchase.id}`}
        backLabel="Detalle de la compra"
      />
      <PurchaseForm purchase={purchase} />
    </div>
  );
}
