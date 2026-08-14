import { AlertTriangle, Printer } from 'lucide-react';
import * as React from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { useClient } from '@/features/clients/hooks';
import { useSale } from '@/features/sales/hooks';
import { useVehicle } from '@/features/vehicles/hooks';
import { formatCivilDate } from '@/lib/dates';
import { InvoiceDocument } from '../components/invoice-document';
import { HAS_FISCAL_NUMBER } from '../company';
import { buildInvoice } from '../invoice';

/**
 * Vista previa e impresion de la factura de una venta.
 *
 * Imprime con el dialogo del navegador en vez de generar el PDF en JavaScript:
 * "Guardar como PDF" ya esta ahi, el texto sale vectorial y seleccionable (un
 * PDF pintado con canvas sale como imagen), respeta la impresora real del
 * usuario y no añade ninguna dependencia al bundle.
 */
export function InvoicePage() {
  const { id } = useParams<{ id: string }>();

  const saleQuery = useSale(id);
  const sale = saleQuery.data;

  // Enriquecen el documento pero no lo bloquean: si el usuario no tiene permiso
  // sobre clientes o vehiculos, `useClient`/`useVehicle` quedan deshabilitados
  // y la factura sale con los datos que ya trae la venta.
  const clientQuery = useClient(sale?.clientId);
  const vehicleQuery = useVehicle(sale?.vehicleId);

  const invoice = React.useMemo(
    () => (sale ? buildInvoice(sale, clientQuery.data, vehicleQuery.data) : null),
    [sale, clientQuery.data, vehicleQuery.data],
  );

  // El titulo de la ventana es el nombre que el navegador propone al guardar el
  // PDF: sin esto el archivo se llamaria "JFM AutoManager.pdf".
  React.useEffect(() => {
    if (!sale) return;

    const previous = document.title;
    document.title = `${sale.saleNumber} — ${sale.clientName}`;
    return () => {
      document.title = previous;
    };
  }, [sale]);

  if (saleQuery.isLoading) return <DetailSkeleton />;

  if (saleQuery.isError || !sale || !invoice) {
    return <ErrorState error={saleQuery.error} onRetry={() => void saleQuery.refetch()} />;
  }

  // Los datos accesorios pueden seguir en vuelo: imprimir a medias produciria un
  // documento sin el RNC del cliente y nadie lo notaria hasta tenerlo en papel.
  const enriching = clientQuery.isLoading || vehicleQuery.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <PageHeader
          eyebrow="Facturacion"
          title={`Factura ${sale.saleNumber}`}
          description={`${sale.clientName} · ${formatCivilDate(sale.saleDate)}`}
          backTo={`/sales/${sale.id}`}
          backLabel="Volver a la venta"
          actions={
            <Button onClick={() => window.print()} loading={enriching}>
              <Printer />
              Imprimir o guardar PDF
            </Button>
          }
        />

        {!HAS_FISCAL_NUMBER && (
          <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/8 px-3.5 py-3 text-[13px] leading-relaxed text-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <span>
              Sin <strong className="font-semibold">NCF</strong> configurado, el documento se imprime
              rotulado como comprobante interno sin valor fiscal. Define{' '}
              <code className="num rounded bg-muted px-1 py-0.5 text-[12px]">VITE_INVOICE_NCF</code>{' '}
              y los datos del emisor para emitirlo como factura.
            </span>
          </p>
        )}
      </div>

      {/* Lienzo gris que simula la mesa: hace legible el borde de la hoja. */}
      <div className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 shadow-card sm:p-8 print:overflow-visible print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none">
        <div className="mx-auto w-fit shadow-pop print:w-full print:shadow-none">
          <InvoiceDocument invoice={invoice} />
        </div>
      </div>
    </div>
  );
}
