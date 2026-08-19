import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PrintChart } from '@/components/print-chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CHART_GRID, CHART_TOOLTIP_STYLE, seriesColor, useChartStyles } from '@/lib/chart-theme';
import { formatCivilMonth } from '@/lib/dates';
import { formatMoney, formatMoneyCompact, formatNumber } from '@/lib/money';
import { MonthRangeFilter, ReportCard, ReportTotals } from './report-shell';
import {
  useMonthlyReturnsReport,
  useMonthlySalesReport,
  useSalesBySalesperson,
} from '../hooks';
import { REPORT_CURRENCY, type MonthRangeParams, monthKey, sumConverted } from '../types';

export function SalesPanel() {
  // Ejes y leyenda encogen al imprimir, y por props: recharts coloca cada
  // etiqueta a partir del tamaño que recibe aqui.
  const { axisTick, legendStyle, isAnimationActive } = useChartStyles();

  const [range, setRange] = React.useState<MonthRangeParams>({});

  const monthly = useMonthlySalesReport(range);
  const bySalesperson = useSalesBySalesperson(range);
  const returns = useMonthlyReturnsReport(range);

  const monthlyRows = monthly.data ?? [];
  const salespersonRows = bySalesperson.data ?? [];

  /*
   * El backend devuelve una fila por mes Y moneda. Para la grafica hay que
   * plegar las monedas en un solo punto por mes, y eso solo se puede hacer con
   * los importes ya convertidos: sumar pesos con dolares no significa nada.
   */
  const porMes = React.useMemo(() => {
    const mapa = new Map<string, { label: string; total: number; ventas: number }>();

    for (const row of monthlyRows) {
      const clave = monthKey(row.month);
      const actual = mapa.get(clave) ?? {
        label: formatCivilMonth(clave),
        total: 0,
        ventas: 0,
      };
      actual.total += row.totalAmountConverted;
      actual.ventas += row.salesCount;
      mapa.set(clave, actual);
    }

    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({
        ...value,
        total: Math.round(value.total * 100) / 100,
      }));
  }, [monthlyRows]);

  /** Un vendedor puede aparecer en varios meses y monedas: se pliega igual. */
  const porVendedor = React.useMemo(() => {
    const mapa = new Map<
      string,
      { nombre: string; total: number; ventas: number; unidades: number }
    >();

    for (const row of salespersonRows) {
      const actual = mapa.get(row.salespersonId) ?? {
        nombre: row.salespersonName,
        total: 0,
        ventas: 0,
        unidades: 0,
      };
      actual.total += row.totalAmountConverted;
      actual.ventas += row.salesCount;
      actual.unidades += row.vehiclesCount;
      mapa.set(row.salespersonId, actual);
    }

    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [salespersonRows]);

  const facturado = sumConverted(monthlyRows, (row) => row.totalAmountConverted);
  const operaciones = monthlyRows.reduce((total, row) => total + row.salesCount, 0);
  /*
   * Documentos y unidades son dos cifras distintas desde que una venta puede
   * llevar varios vehiculos. El ticket promedio se calcula por DOCUMENTO, que
   * es lo que mide el valor de una operacion comercial.
   */
  const unidades = monthlyRows.reduce((total, row) => total + row.vehiclesCount, 0);
  const ticket = operaciones > 0 ? facturado / operaciones : 0;

  /*
   * Tasa de devolucion: unidades devueltas sobre unidades entregadas. Es la
   * lectura que da sentido al reporte de devoluciones — un numero de unidades
   * devueltas, solo, no dice si es mucho o poco.
   */
  const returnRows = returns.data ?? [];
  const devueltas = returnRows.reduce((total, row) => total + row.returnedCount, 0);
  const reintegrado = sumConverted(returnRows, (row) => row.totalRefundedConverted);
  const tasaDevolucion = unidades > 0 ? (devueltas / unidades) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <MonthRangeFilter value={range} onChange={setRange} />

      <ReportTotals
        items={[
          {
            label: `Facturado (${REPORT_CURRENCY})`,
            value: formatMoney(facturado, REPORT_CURRENCY),
          },
          { label: 'Operaciones', value: formatNumber(operaciones) },
          {
            label: 'Ticket promedio',
            value: formatMoney(ticket, REPORT_CURRENCY),
          },
          {
            label: 'Unidades entregadas',
            value: formatNumber(unidades),
          },
        ]}
      />

      <ReportCard
        title="Ventas por mes"
        description={`Importes consolidados en ${REPORT_CURRENCY} con la tasa de cada venta.`}
        isLoading={monthly.isLoading}
        isError={monthly.isError}
        error={monthly.error}
        onRetry={() => void monthly.refetch()}
        isEmpty={porMes.length === 0}
      >
        <PrintChart height={300}>
          <BarChart data={porMes} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatMoneyCompact(value)}
              width={70}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value: number) => [formatMoney(value, REPORT_CURRENCY), 'Facturado']}
            />
            <Bar
              dataKey="total"
              name="Facturado"
              fill={seriesColor(0)}
              radius={[3, 3, 0, 0]}
              isAnimationActive={isAnimationActive}
            />
          </BarChart>
        </PrintChart>
      </ReportCard>

      <ReportCard
        title="Operaciones cerradas por mes"
        description="Cantidad de ventas registradas en cada periodo."
        isLoading={monthly.isLoading}
        isError={monthly.isError}
        error={monthly.error}
        onRetry={() => void monthly.refetch()}
        isEmpty={porMes.length === 0}
        height={220}
      >
        <PrintChart height={220}>
          <LineChart data={porMes} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={40}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value: number) => [`${value} ventas`, 'Ventas']}
            />
            <Line
              isAnimationActive={isAnimationActive}
              type="monotone"
              dataKey="ventas"
              stroke={seriesColor(1)}
              strokeWidth={2}
              dot={{ r: 2.5, strokeWidth: 0, fill: seriesColor(1) }}
              activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'var(--card)' }}
            />
          </LineChart>
        </PrintChart>
      </ReportCard>

      <ReportCard
        title="Ventas por vendedor"
        description={`Acumulado del periodo, consolidado en ${REPORT_CURRENCY}.`}
        isLoading={bySalesperson.isLoading}
        isError={bySalesperson.isError}
        error={bySalesperson.error}
        onRetry={() => void bySalesperson.refetch()}
        isEmpty={porVendedor.length === 0}
        height={260}
      >
        <div className="flex flex-col gap-6">
          <PrintChart height={Math.max(160, porVendedor.length * 44)}>
            <BarChart
              data={porVendedor}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatMoneyCompact(value)}
              />
              <YAxis
                type="category"
                dataKey="nombre"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={140}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number) => [formatMoney(value, REPORT_CURRENCY), 'Facturado']}
              />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
              <Bar
                dataKey="total"
                name="Facturado"
                fill={seriesColor(0)}
                radius={[0, 3, 3, 0]}
                isAnimationActive={isAnimationActive}
              />
            </BarChart>
          </PrintChart>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Facturado</TableHead>
                <TableHead className="text-right">Ticket promedio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porVendedor.map((row) => (
                <TableRow key={row.nombre}>
                  <TableCell className="font-medium">{row.nombre}</TableCell>
                  <TableCell className="num text-right">{formatNumber(row.ventas)}</TableCell>
                  <TableCell className="num text-right text-muted-foreground">
                    {formatNumber(row.unidades)}
                  </TableCell>
                  <TableCell className="num text-right">
                    {formatMoney(row.total, REPORT_CURRENCY)}
                  </TableCell>
                  <TableCell className="num text-right text-muted-foreground">
                    {formatMoney(row.ventas > 0 ? row.total / row.ventas : 0, REPORT_CURRENCY)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ReportCard>
      <ReportCard
        title="Devoluciones"
        description="Unidades que volvieron y dinero reintegrado en el periodo."
        isLoading={returns.isLoading}
        isError={returns.isError}
        error={returns.error}
        onRetry={() => void returns.refetch()}
        isEmpty={returnRows.length === 0}
        emptyLabel="Ninguna unidad se devolvio en el periodo."
        height={220}
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <ReportFigure label="Unidades devueltas" value={formatNumber(devueltas)} />
            <ReportFigure
              label="Tasa de devolucion"
              value={`${tasaDevolucion.toFixed(1)} %`}
              hint={`sobre ${formatNumber(unidades)} entregadas`}
            />
            <ReportFigure
              label="Reintegrado"
              value={formatMoney(reintegrado, REPORT_CURRENCY)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Ventas afectadas</TableHead>
                <TableHead className="text-right">Valor devuelto</TableHead>
                <TableHead className="text-right">Reintegrado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnRows.map((row, index) => (
                <TableRow key={`${row.month}-${row.currencyCode}-${index}`}>
                  <TableCell>{formatCivilMonth(monthKey(row.month))}</TableCell>
                  <TableCell className="num text-right">
                    {formatNumber(row.returnedCount)}
                  </TableCell>
                  <TableCell className="num text-right text-muted-foreground">
                    {formatNumber(row.salesCount)}
                  </TableCell>
                  <TableCell className="num text-right">
                    {formatMoney(row.totalAmountConverted, REPORT_CURRENCY)}
                  </TableCell>
                  <TableCell className="num text-right text-warning">
                    {formatMoney(row.totalRefundedConverted, REPORT_CURRENCY)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Devolver el vehiculo y devolver el dinero son operaciones distintas: el valor devuelto
            es lo que salio del total de las ventas, y el reintegro, lo que efectivamente volvio al
            cliente. No tienen por que coincidir.
          </p>
        </div>
      </ReportCard>
    </div>
  );
}

/** Cifra suelta dentro de una tarjeta de reporte. */
function ReportFigure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label-micro text-muted-foreground">{label}</span>
      <span className="num text-lg font-semibold leading-none">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
