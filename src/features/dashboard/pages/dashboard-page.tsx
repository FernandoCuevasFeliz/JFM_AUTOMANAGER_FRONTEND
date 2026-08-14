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
import { userAccent, userAccentStyle } from '@/lib/user-accent';
import { cn } from '@/lib/utils';
import { useMonthlySales } from '../hooks';

/**
 * Estilo unico de los tooltips de recharts, para no repetirlo en cada grafica.
 * La sombra va literal: `@theme inline` incrusta `--shadow-pop` en la utilidad
 * `shadow-pop` y no lo publica como custom property en tiempo de ejecucion.
 */
const TOOLTIP_STYLE = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  boxShadow: '0 10px 30px -8px oklch(0.21 0.04 265 / 0.18), 0 2px 8px -2px oklch(0.21 0.04 265 / 0.08)',
  fontSize: 13,
  padding: '8px 10px',
} as const;

const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' } as const;

/** Colores del tema, para que las graficas hablen el mismo idioma que la UI. */
const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

/**
 * Color de cada estado en las graficas.
 *
 * Sigue el mismo tono que el badge del estado en `lib/status.ts`: si en la tabla
 * "Reservado" es ambar, en el donut tiene que ser ambar. Un mismo estado con dos
 * colores obliga a leer la leyenda en cada vistazo.
 */
const STATUS_COLORS: Record<VehicleStatus, string> = {
  in_transit: 'oklch(0.55 0.16 255)',
  in_inventory: 'var(--chart-2)',
  reserved: 'var(--chart-3)',
  sold: 'var(--chart-5)',
  in_repair: 'oklch(0.6 0.105 195)',
  unavailable: 'var(--muted-foreground)',
};

export function DashboardPage() {
  const { user } = useAuth();
  const accent = userAccent(user?.id);

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
    /*
     * El acento personal solo vive dentro del tablero: identifica la sesion sin
     * repintar la aplicacion entera, que seguiria siendo grafito y rojo para
     * todo el mundo.
     */
    <div className="flex flex-col gap-6" style={userAccentStyle(user?.id)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow="Tablero"
          title={`Hola, ${user?.firstName ?? ''}`}
          description="Resumen del inventario y del desempeno comercial."
        />

        <span
          className="flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-[var(--user-accent-soft)] py-1.5 pl-1.5 pr-3.5"
          title={`Color de sesion: ${accent.name}`}
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--user-accent)] text-[11px] font-semibold text-white">
            {`${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`.toUpperCase()}
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[13px] font-medium">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="label-micro mt-0.5 text-muted-foreground">{user?.roleName}</span>
          </span>
        </span>
      </div>

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
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => formatMoneyCompact(value)}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatMoney(value, reporting), name]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Bar dataKey="totalAmount" name="Facturado" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="totalCollected" name="Cobrado" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
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
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
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
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} ventas`, 'Ventas']}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Line
                  type="monotone"
                  dataKey="totalSales"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 2.5, strokeWidth: 0, fill: CHART_COLORS[0] }}
                  activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'var(--card)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Tarjeta de KPI.
 *
 * La cifra manda: monoespaciada, grande y sin competencia visual. El icono se
 * queda en gris y pequeño porque no aporta dato, solo ayuda a reencontrar la
 * tarjeta de un vistazo. El filete superior de color es la unica señal de tono,
 * y va acompañado del color del propio numero: nunca solo color.
 */
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
    <Card
      className={cn(
        'group relative h-full overflow-hidden transition-[border-color,box-shadow] duration-200',
        to && 'hover:border-foreground/25 hover:shadow-raised',
      )}
    >
      {/* Filete superior: gris en reposo, color cuando el dato tiene carga. */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-0 h-0.5',
          tone === 'positive' && 'bg-success',
          tone === 'warning' && 'bg-warning',
          tone === 'neutral' && 'bg-[var(--user-accent,var(--border))]',
        )}
      />

      <CardContent className="flex items-start justify-between gap-3 px-5 pb-5 pt-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="label-micro text-muted-foreground">{label}</span>
          <span
            className={cn(
              'num truncate text-[26px] font-semibold leading-none',
              tone === 'positive' && 'text-success',
              tone === 'warning' && 'text-warning',
            )}
          >
            {value}
          </span>
          {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
        </div>

        <Icon
          className={cn(
            'size-5 shrink-0 text-muted-foreground/50 transition-colors',
            to && 'group-hover:text-foreground',
          )}
          aria-hidden
        />
      </CardContent>
    </Card>
  );

  return to ? (
    <Link to={to} className="rounded-xl">
      {content}
    </Link>
  ) : (
    content
  );
}
