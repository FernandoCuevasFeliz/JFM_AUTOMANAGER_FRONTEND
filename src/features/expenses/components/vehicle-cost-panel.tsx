import { TrendingDown, TrendingUp } from 'lucide-react';
import { ErrorState } from '@/components/states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney, formatPercentage } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useVehicleCost } from '../hooks';

/**
 * Costo real y margen de una unidad.
 *
 * Los importes en moneda original y los convertidos se muestran por separado a
 * proposito: **solo los `…Converted` son sumables entre si** (§5.8 de API.md).
 * Mezclarlos daria un total de pesos con dolares dentro.
 */
export function VehicleCostPanel({ vehicleId }: { vehicleId: string }) {
  const costQuery = useVehicleCost(vehicleId);

  if (costQuery.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (costQuery.isError || !costQuery.data) {
    return <ErrorState error={costQuery.error} onRetry={() => void costQuery.refetch()} />;
  }

  const cost = costQuery.data;
  const reporting = cost.reportingCurrency;
  const sold = cost.soldPrice !== null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Composicion del costo</CardTitle>
          <CardDescription>
            Importes convertidos a {reporting} con la tasa de cada documento.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Importacion
              {cost.purchaseCurrencyCode && cost.purchaseCurrencyCode !== reporting && (
                <span className="ml-2 font-normal normal-case tracking-normal">
                  (origen en {cost.purchaseCurrencyCode}, tasa{' '}
                  {cost.purchaseExchangeRate ?? '—'})
                </span>
              )}
            </h4>

            <CostRow
              label="Costo de compra"
              amount={cost.purchaseCost}
              currency={cost.purchaseCurrencyCode}
            />
            <CostRow label="Flete" amount={cost.freightCost} currency={cost.purchaseCurrencyCode} />
            <CostRow label="Seguro" amount={cost.insuranceCost} currency={cost.purchaseCurrencyCode} />
            <CostRow
              label="Otros costos"
              amount={cost.otherPurchaseCosts}
              currency={cost.purchaseCurrencyCode}
            />

            <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-sm font-medium">
              <span>Subtotal de importacion</span>
              <span className="tabular">{formatMoney(cost.importSubtotalConverted, reporting)}</span>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Gastos imputados
            </h4>

            {cost.expensesByCurrency.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Esta unidad todavia no tiene gastos registrados.
              </p>
            ) : (
              cost.expensesByCurrency.map((entry) => (
                <div key={entry.currencyCode} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Gastos en {entry.currencyCode}
                    <span className="ml-2 text-xs">
                      ({formatMoney(entry.total, entry.currencyCode)})
                    </span>
                  </span>
                  <span className="tabular">{formatMoney(entry.totalConverted, reporting)}</span>
                </div>
              ))
            )}

            <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-sm font-medium">
              <span>Total de gastos</span>
              <span className="tabular">{formatMoney(cost.expensesTotalConverted, reporting)}</span>
            </div>
          </section>

          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
            <span className="font-semibold">Costo total de la unidad</span>
            <span className="tabular text-lg font-semibold">
              {formatMoney(cost.totalCostConverted, reporting)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Margen</CardTitle>
          <CardDescription>
            {sold ? 'Calculado sobre el precio de venta real.' : 'Disponible al concretarse la venta.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Metric label="Precio de lista" value={formatMoney(cost.listPrice, reporting)} />

          {sold ? (
            <>
              <Metric
                label={`Precio de venta${
                  cost.saleCurrencyCode && cost.saleCurrencyCode !== reporting
                    ? ` (${formatMoney(cost.soldPrice, cost.saleCurrencyCode)})`
                    : ''
                }`}
                value={formatMoney(cost.soldPriceConverted, reporting)}
              />

              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  {(cost.margin ?? 0) >= 0 ? (
                    <TrendingUp className="size-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="size-4 text-destructive" />
                  )}
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Margen
                  </span>
                </div>
                <p
                  className={cn(
                    'tabular mt-1 text-2xl font-semibold',
                    (cost.margin ?? 0) >= 0 ? 'text-emerald-600' : 'text-destructive',
                  )}
                >
                  {formatMoney(cost.margin, reporting)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatPercentage(cost.marginPercentage)} sobre el costo
                </p>
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              El margen se calcula cuando la unidad se vende.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CostRow({
  label,
  amount,
  currency,
}: {
  label: string;
  amount: number | null;
  currency: string | null;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{formatMoney(amount, currency)}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="tabular text-lg font-semibold">{value}</span>
    </div>
  );
}
