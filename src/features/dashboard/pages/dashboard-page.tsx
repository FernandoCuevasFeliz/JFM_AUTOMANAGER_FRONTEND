import { BadgeDollarSign, Car, CircleDollarSign, Wallet } from 'lucide-react';
import type * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/page-header';
import { CardSkeleton, ErrorState } from '@/components/states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/use-auth';
import { useSalesSummary } from '@/features/sales/hooks';
import { useVehiclesSummary } from '@/features/vehicles/hooks';
import { formatCivilMonth } from '@/lib/dates';
import { formatMoney, formatMoneyCompact, formatNumber } from '@/lib/money';
import { VEHICLE_STATUS_META, type VehicleStatus } from '@/lib/status';
import { useMonthlySales } from '../hooks';

/** Colores del tema, para que las graficas hablen el mismo idioma que la UI. */
const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const STATUS_COLORS: Record<VehicleStatus, string> = {
  in_transit: 'var(--chart-1)',
  in_inventory: 'var(--chart-2)',
  reserved: 'var(--chart-3)',
  sold: 'var(--chart-4)',
  in_repair: 'var(--chart-5)',
  unavailable: 'var(--muted-foreground)',
};

export function DashboardPage() {
  const { user } = useAuth();

  const vehiclesSummary = useVehiclesSummary();
  const salesSummary = useSalesSummary();
  const monthlySales = useMonthlySales(6);

  const reporting = salesSummary.data?.reportingCurrency ?? 'DOP';

  const statusData = vehiclesSummary.data
    ? (Object.entries(vehiclesSummary.data.byStatus) as [VehicleStatus, number][])
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          status,
          name: VEHICLE_STATUS_META[status].label,
          value: count,
        }))
    : [];

  const monthlyChartData = monthlySales.data.map((entry) => ({
    ...entry,
    label: formatCivilMonth(entry.month),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hola, ${user?.firstName ?? ''}`}
        description="Resumen del inventario y del desempeno comercial."
      />

      {/* --- Tarjetas de cabecera --- */}
      {vehiclesSummary.isLoading || salesSummary.isLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Car}
            label="Unidades en inventario"
            value={formatNumber(vehiclesSummary.data?.available ?? 0)}
            hint={`${formatNumber(vehiclesSummary.data?.total ?? 0)} unidades en total`}
            to="/vehicles"
          />
          <MetricCard
            icon={BadgeDollarSign}
            label="Ventas registradas"
            value={formatNumber(salesSummary.data?.totalSales ?? 0)}
            hint={`${formatMoneyCompact(salesSummary.data?.totalAmount, reporting)} facturados`}
            to="/sales"
          />
          <MetricCard
            icon={Wallet}
            label="Cobrado"
            value={formatMoneyCompact(salesSummary.data?.totalCollected, reporting)}
            hint={`Consolidado en ${reporting}`}
            tone="positive"
          />
          <MetricCard
            icon={CircleDollarSign}
            label="Saldo por cobrar"
            value={formatMoneyCompact(salesSummary.data?.pendingBalance, reporting)}
            hint="Pendiente en ventas abiertas"
            tone={(salesSummary.data?.pendingBalance ?? 0) > 0 ? 'warning' : 'neutral'}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* --- Monto vendido y cobrado por mes --- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas de los ultimos 6 meses</CardTitle>
            <CardDescription>
              Montos consolidados en {reporting} con la tasa de cada venta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlySales.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : monthlySales.isError ? (
              <ErrorState error={monthlySales.error} onRetry={monthlySales.refetch} />
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <BarChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => formatMoneyCompact(value)}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatMoney(value, reporting), name]}
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="totalAmount" name="Facturado" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalCollected" name="Cobrado" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* --- Inventario por estado --- */}
        <Card>
          <CardHeader>
            <CardTitle>Inventario por estado</CardTitle>
            <CardDescription>Distribucion de las unidades registradas.</CardDescription>
          </CardHeader>
          <CardContent>
            {vehiclesSummary.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : vehiclesSummary.isError ? (
              <ErrorState
                error={vehiclesSummary.error}
                onRetry={() => void vehiclesSummary.refetch()}
              />
            ) : statusData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Todavia no hay unidades registradas.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} unidades`, name]}
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Numero de operaciones por mes --- */}
      <Card>
        <CardHeader>
          <CardTitle>Operaciones cerradas por mes</CardTitle>
          <CardDescription>Cantidad de ventas registradas en cada periodo.</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlySales.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <LineChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} ventas`, 'Ventas']}
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalSales"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  to,
  tone = 'neutral',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  to?: string;
  tone?: 'neutral' | 'positive' | 'warning';
}) {
  const content = (
    <Card className="h-full transition-colors hover:border-primary/40">
      <CardContent className="flex items-start justify-between gap-3 p-6">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span
            className={[
              'tabular truncate text-2xl font-semibold',
              tone === 'positive' ? 'text-emerald-600' : '',
              tone === 'warning' ? 'text-amber-600' : '',
            ].join(' ')}
          >
            {value}
          </span>
          {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
        </div>

        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4.5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}
