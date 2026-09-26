import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PrintChart } from '@/components/print-chart';
import { FilterSelect } from '@/components/filter-bar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useExpenseCategories } from '@/features/catalogs/hooks';
import {
  CHART_GRID,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  seriesColor,
  useChartStyles,
} from '@/lib/chart-theme';
import { formatCivilMonth } from '@/lib/dates';
import { formatMoney, formatMoneyCompact, formatNumber } from '@/lib/money';
import type { ExpenseScope } from '@/lib/status';
import { EXPENSE_SCOPE_META } from '@/lib/status';
import { MonthRangeFilter, ReportCard, ReportTotals } from './report-shell';
import { useMonthlyExpensesReport } from '../hooks';
import { REPORT_CURRENCY, type MonthlyExpensesParams, monthKey, sumConverted } from '../types';

export function ExpensesPanel() {
  // Ejes y leyenda encogen al imprimir, y por props: recharts coloca cada
  // etiqueta a partir del tamaño que recibe aqui.
  const { axisTick, legendStyle, isAnimationActive } = useChartStyles();

  const [filters, setFilters] = React.useState<MonthlyExpensesParams>({});
  const categories = useExpenseCategories();

  const report = useMonthlyExpensesReport(filters);
  const rows = report.data ?? [];

  /** Una fila por mes, categoria, alcance y moneda: se pliega por mes. */
  const porMes = React.useMemo(() => {
    const mapa = new Map<string, { label: string; total: number }>();

    for (const row of rows) {
      const clave = monthKey(row.month);
      const actual = mapa.get(clave) ?? {
        label: formatCivilMonth(clave),
        total: 0,
      };
      actual.total += row.totalAmountConverted;
      mapa.set(clave, actual);
    }

    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({
        ...value,
        total: Math.round(value.total * 100) / 100,
      }));
  }, [rows]);

  const porCategoria = React.useMemo(() => {
    const mapa = new Map<
      string,
      { nombre: string; scope: ExpenseScope; total: number; conteo: number }
    >();

    for (const row of rows) {
      const actual = mapa.get(row.categoryId) ?? {
        nombre: row.categoryName,
        scope: row.scope,
        total: 0,
        conteo: 0,
      };
      actual.total += row.totalAmountConverted;
      actual.conteo += row.expenseCount;
      mapa.set(row.categoryId, actual);
    }

    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [rows]);

  const total = sumConverted(rows, (row) => row.totalAmountConverted);
  const conteo = rows.reduce((acumulado, row) => acumulado + row.expenseCount, 0);
  const porUnidad = sumConverted(
    rows.filter((row) => row.scope === 'vehicle'),
    (row) => row.totalAmountConverted,
  );

  return (
    <div className="flex flex-col gap-4">
      <MonthRangeFilter value={filters} onChange={(next) => setFilters({ ...filters, ...next })}>
        <FilterSelect
          value={filters.categoryId}
          onChange={(value) => setFilters({ ...filters, categoryId: value })}
          placeholder="Categoria"
          allLabel="Todas las categorias"
          options={categories.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
        />
        <FilterSelect
          value={filters.scope}
          onChange={(value) => setFilters({ ...filters, scope: value as ExpenseScope | undefined })}
          placeholder="Alcance"
          allLabel="Todos los alcances"
          options={[
            { value: 'vehicle', label: 'Por vehiculo' },
            { value: 'general', label: 'General' },
          ]}
        />
      </MonthRangeFilter>

      <ReportTotals
        items={[
          {
            label: `Gasto total (${REPORT_CURRENCY})`,
            value: formatMoney(total, REPORT_CURRENCY),
          },
          { label: 'Registros', value: formatNumber(conteo) },
          {
            label: 'Imputado a unidades',
            value: formatMoney(porUnidad, REPORT_CURRENCY),
          },
          {
            label: 'Gasto de empresa',
            value: formatMoney(Math.round((total - porUnidad) * 100) / 100, REPORT_CURRENCY),
          },
        ]}
      />

      <ReportCard
        title="Gasto por mes"
        description={`Consolidado en ${REPORT_CURRENCY} con la tasa de cada gasto.`}
        isLoading={report.isLoading}
        isError={report.isError}
        error={report.error}
        onRetry={() => void report.refetch()}
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
              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              formatter={(value: number) => [formatMoney(value, REPORT_CURRENCY), 'Gasto']}
            />
            <Bar
              dataKey="total"
              name="Gasto"
              fill={seriesColor(2)}
              radius={[3, 3, 0, 0]}
              isAnimationActive={isAnimationActive}
            />
          </BarChart>
        </PrintChart>
      </ReportCard>

      <ReportCard
        title="Reparto por categoria"
        description="Donde se va el gasto del periodo."
        isLoading={report.isLoading}
        isError={report.isError}
        error={report.error}
        onRetry={() => void report.refetch()}
        isEmpty={porCategoria.length === 0}
        height={280}
      >
        <div className="print-stack grid gap-6 lg:grid-cols-2">
          <PrintChart height={280}>
            <PieChart>
              {/* En porcentaje encoge con la caja; en pixeles se recortaba al
                  imprimir. Ver la nota del donut de `overview-panel`. */}
              <Pie
                isAnimationActive={isAnimationActive}
                data={porCategoria}
                dataKey="total"
                nameKey="nombre"
                innerRadius="52%"
                outerRadius="82%"
                paddingAngle={2}
              >
                {porCategoria.map((entry, index) => (
                  <Cell key={entry.nombre} fill={seriesColor(index)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                formatter={(value: number, name: string) => [
                  formatMoney(value, REPORT_CURRENCY),
                  name,
                ]}
              />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
            </PieChart>
          </PrintChart>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Categoria</TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead className="text-right">Registros</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porCategoria.map((row) => (
                <TableRow key={row.nombre}>
                  <TableCell className="font-medium">{row.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {EXPENSE_SCOPE_META[row.scope].label}
                  </TableCell>
                  <TableCell className="num text-right">{formatNumber(row.conteo)}</TableCell>
                  <TableCell className="num text-right">
                    {formatMoney(row.total, REPORT_CURRENCY)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ReportCard>
    </div>
  );
}
