import { FileSpreadsheet, Plus } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import type { Sale } from '@/features/sales/types';
import { formatMoney } from '@/lib/money';
import { FISCAL_DOC_STATUS_META } from '@/lib/status';
import { useCreateInvoice, useInvoiceBySale } from '../hooks';
import { INVOICE_NCF_TYPES, NCF_TYPE_HINTS, NCF_TYPE_LABELS, type NcfType } from '../types';

/**
 * Facturacion dentro de la ficha de una venta.
 *
 * Una venta tiene un solo comprobante, asi que el panel tiene dos caras: o
 * enlaza al que ya existe, o deja crearlo. El tipo de e-CF se elige aqui porque
 * depende de quien es el receptor, y eso solo lo sabe quien factura.
 */
export function SaleInvoicePanel({ sale }: { sale: Sale }) {
  const { can } = useAuth();
  const invoiceQuery = useInvoiceBySale(sale.id);
  const createInvoice = useCreateInvoice();

  const [ncfType, setNcfType] = React.useState<NcfType>('E32');

  if (!can('invoices:read')) return null;

  const invoice = invoiceQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comprobante fiscal</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {invoiceQuery.isLoading ? (
          <p className="text-[13px] text-muted-foreground">Comprobando…</p>
        ) : invoice ? (
          <>
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge meta={FISCAL_DOC_STATUS_META[invoice.status]} />
              <span className="num text-sm font-medium">
                {invoice.ncfNumber ?? 'Sin NCF asignado'}
              </span>
            </div>

            <dl className="flex flex-col gap-1.5 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>
                  {invoice.ncfType} · {NCF_TYPE_LABELS[invoice.ncfType]}
                </dd>
              </div>
              {invoice.creditedAmount > 0 && (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Acreditado</dt>
                    <dd className="num">
                      {formatMoney(invoice.creditedAmount, invoice.currencyCode)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Neto</dt>
                    <dd className="num font-medium">
                      {formatMoney(invoice.netAmount, invoice.currencyCode)}
                    </dd>
                  </div>
                </>
              )}
            </dl>

            <Button variant="outline" size="sm" asChild className="w-fit">
              <Link to={`/invoices/${invoice.id}`}>
                <FileSpreadsheet />
                Ver comprobante
              </Link>
            </Button>
          </>
        ) : sale.status === 'cancelled' ? (
          // Regla del backend: una venta cancelada no se factura (§7).
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Una venta cancelada no se factura.
          </p>
        ) : !can('invoices:write') ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Esta venta todavia no tiene comprobante.
          </p>
        ) : (
          <>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Esta venta todavia no tiene comprobante. Elige el tipo segun quien sea el receptor.
            </p>

            <div className="flex flex-col gap-1.5">
              <Select value={ncfType} onValueChange={(value) => setNcfType(value as NcfType)}>
                <SelectTrigger aria-label="Tipo de comprobante">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_NCF_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type} · {NCF_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {NCF_TYPE_HINTS[ncfType]}
              </p>
            </div>

            <Button
              size="sm"
              className="w-fit"
              loading={createInvoice.isPending}
              onClick={() => createInvoice.mutate({ saleId: sale.id, ncfType })}
            >
              <Plus />
              Crear comprobante
            </Button>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Nace pendiente y sin NCF. Una vez facturada, la venta ya no se podra cancelar sin
              anular antes el comprobante.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
