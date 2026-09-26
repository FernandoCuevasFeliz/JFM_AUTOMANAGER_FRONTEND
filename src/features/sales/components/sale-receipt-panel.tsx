import { Eye, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/money';
import type { Sale } from '../types';

export function SaleReceiptPanel({ sale }: { sale: Sale }) {
  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle>Comprobante de venta</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"
            aria-hidden
          >
            <ReceiptText className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="num text-sm font-medium">{sale.saleNumber}</p>
            <p className="text-xs text-muted-foreground">Documento interno de venta.</p>
          </div>
        </div>

        <dl className="flex flex-col gap-1.5 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="num font-medium">{formatMoney(sale.salePrice, sale.currencyCode)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Cobrado</dt>
            <dd className="num">{formatMoney(sale.totalPaid, sale.currencyCode)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Saldo</dt>
            <dd className="num">{formatMoney(sale.pendingBalance, sale.currencyCode)}</dd>
          </div>
        </dl>

        <Button variant="outline" size="sm" className="w-fit" asChild>
          <Link to={`/sales/${sale.id}/receipt`}>
            <Eye />
            Ver comprobante
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
