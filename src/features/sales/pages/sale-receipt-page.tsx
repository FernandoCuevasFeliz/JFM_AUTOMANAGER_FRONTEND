import { Printer } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { PrintPreview } from '@/components/print-sheet';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { imprimirPagina } from '@/lib/use-print-mode';
import { SaleReceiptDocument } from '../components/sale-receipt-document';
import { useSale } from '../hooks';

export function SaleReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const saleQuery = useSale(id);

  if (saleQuery.isLoading) return <DetailSkeleton />;

  if (saleQuery.isError || !saleQuery.data) {
    return <ErrorState error={saleQuery.error} onRetry={() => void saleQuery.refetch()} />;
  }

  const sale = saleQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <PageHeader
          eyebrow="Comprobante de venta"
          title={sale.saleNumber}
          description={`Documento interno de la venta de ${sale.clientName}.`}
          backTo={`/sales/${sale.id}`}
          backLabel="Volver a la venta"
          actions={
            <Button onClick={imprimirPagina}>
              <Printer />
              Imprimir
            </Button>
          }
        />
      </div>

      <PrintPreview>
        <SaleReceiptDocument sale={sale} />
      </PrintPreview>
    </div>
  );
}
