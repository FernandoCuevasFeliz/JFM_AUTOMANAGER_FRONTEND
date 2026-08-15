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
import { StatusBadge } from '@/components/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NCF_TYPE_LABELS, INVOICE_NCF_TYPES, type NcfType } from '@/features/billing/types';
import { CHART_GRID, CHART_TOOLTIP_STYLE, seriesColor, useChartStyles } from '@/lib/chart-theme';
import { formatCivilMonth } from '@/lib/dates';
import { formatMoney, formatMoneyCompact, formatNumber } from '@/lib/money';
import {
  FISCAL_DOC_STATUSES,
  FISCAL_DOC_STATUS_META,
  VEHICLE_STATUS_META,
  type FiscalDocStatus,
  type VehicleStatus,
} from '@/lib/status';
import { MonthRangeFilter, ReportCard, ReportTotals } from './report-shell';
import { useFiscalDocumentsReport, useInventoryStatusReport } from '../hooks';
import {
  FISCAL_DOCUMENT_KINDS,
  FISCAL_DOCUMENT_KIND_LABELS,
  REPORT_CURRENCY,
  type FiscalDocumentKind,
  type FiscalDocumentsParams,
  monthKey,
  sumConverted,
} from '../types';

/** Mismo color que el badge del estado: el donut y la tabla deben coincidir. */
const STATUS_COLORS: Record<VehicleStatus, string> = {
  in_transit: 'oklch(0.55 0.16 255)',
  in_inventory: 'var(--chart-2)',
  reserved: 'var(--chart-3)',
  sold: 'var(--chart-5)',
  in_repair: 'oklch(0.6 0.105 195)',
  unavailable: 'var(--muted-foreground)',
};

export function OverviewPanel() {
  // Ejes y leyenda encogen al imprimir, y por props: recharts coloca cada
  // etiqueta a partir del tamaño que recibe aqui.
  const { axisTick, legendStyle, isAnimationActive } = useChartStyles();

  const [fiscalFilters, setFiscalFilters] = React.useState<FiscalDocumentsParams>({});

  const inventory = useInventoryStatusReport();
  const fiscal = useFiscalDocumentsReport(fiscalFilters);

  const inventoryRows = inventory.data ?? [];
  const fiscalRows = fiscal.data ?? [];

  const inventoryData = React.useMemo(
    () =>
      inventoryRows
        .filter((row) => row.vehicleCount > 0)
        .map((row) => ({
          status: row.status,
          name: VEHICLE_STATUS_META[row.status]?.label ?? row.status,
          value: row.vehicleCount,
        })),
    [inventoryRows],
  );

  const totalUnidades = inventoryRows.reduce((total, row) => total + row.vehicleCount, 0);
  const disponibles = inventoryRows.find((row) => row.status === 'in_inventory')?.vehicleCount ?? 0;

  /** Una fila por mes, tipo de documento, estado y moneda: se pliega por mes. */
  const fiscalPorMes = React.useMemo(() => {
    const mapa = new Map<string, { label: string; facturas: number; notas: number }>();

    for (const row of fiscalRows) {
      const clave = monthKey(row.month);
      const actual = mapa.get(clave) ?? {
        label: formatCivilMonth(clave),
        facturas: 0,
        notas: 0,
      };
      if (row.documentKind === 'credit_note') actual.notas += row.totalAmountConverted;
      else actual.facturas += row.totalAmountConverted;
      mapa.set(clave, actual);
    }

    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
  }, [fiscalRows]);

  const facturado = sumConverted(
    fiscalRows.filter((row) => row.documentKind === 'invoice' && row.status === 'issued'),
    (row) => row.totalAmountConverted,
  );
  const acreditado = sumConverted(
    fiscalRows.filter((row) => row.documentKind === 'credit_note' && row.status === 'issued'),
    (row) => row.totalAmountConverted,
  );
  const pendientes = fiscalRows
    .filter((row) => row.status === 'pending')
    .reduce((total, row) => total + row.documentCount, 0);
  const rechazados = fiscalRows
    .filter((row) => row.status === 'rejected')
    .reduce((total, row) => total + row.documentCount, 0);

  return (
    <div className="flex flex-col gap-4">
      <ReportTotals
        items={[
          { label: 'Unidades registradas', value: formatNumber(totalUnidades) },
          {
            label: 'Disponibles',
            value: formatNumber(disponibles),
            tone: 'positive',
          },
          {
            label: `Facturado emitido (${REPORT_CURRENCY})`,
            value: formatMoney(facturado, REPORT_CURRENCY),
          },
          {
            label: 'Acreditado por notas',
            value: formatMoney(acreditado, REPORT_CURRENCY),
            tone: acreditado > 0 ? 'warning' : 'neutral',
          },
        ]}
      />

      <div className="print-stack grid gap-4 lg:grid-cols-2">
        <ReportCard
          title="Inventario por estado"
          description="Foto de las unidades ahora mismo."
          isLoading={inventory.isLoading}
          isError={inventory.isError}
          error={inventory.error}
          onRetry={() => void inventory.refetch()}
          isEmpty={inventoryData.length === 0}
          emptyLabel="Todavia no hay unidades registradas."
          height={280}
        >
          <PrintChart height={280}>
            <PieChart>
              {/*
                Radios en porcentaje, no en pixeles.

                Con `outerRadius={100}` el donut media 200px fijos: en pantalla
                sobraba sitio, pero en la hoja la caja se queda en ~215px de
                alto y, restando la leyenda, el circulo salia recortado por
                arriba y por abajo. En porcentaje se mide contra la dimension
                menor del contenedor, asi que encoge con la caja en vez de
                desbordarla.
              */}
              <Pie
                isAnimationActive={isAnimationActive}
                data={inventoryData}
                dataKey="value"
                nameKey="name"
                innerRadius="52%"
                outerRadius="82%"
                paddingAngle={2}
              >
                {inventoryData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [`${value} unidades`, name]}
              />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
            </PieChart>
          </PrintChart>
        </ReportCard>

        <ReportCard
          title="Comprobantes por estado"
          description="Cuantos hay en cada punto del ciclo fiscal."
          isLoading={fiscal.isLoading}
          isError={fiscal.isError}
          error={fiscal.error}
          onRetry={() => void fiscal.refetch()}
          isEmpty={fiscalRows.length === 0}
          height={280}
        >
          <div className="flex flex-col gap-4">
            {(pendientes > 0 || rechazados > 0) && (
              <p className="rounded-lg border border-warning/30 bg-warning/8 px-3.5 py-2.5 text-[13px] leading-relaxed">
                {pendientes > 0 && (
                  <>
                    <strong className="font-semibold">{pendientes}</strong> comprobante(s) sin
                    enviar a la DGII.{' '}
                  </>
                )}
                {rechazados > 0 && (
                  <>
                    <strong className="font-semibold">{rechazados}</strong> rechazado(s) a la espera
                    de correccion.
                  </>
                )}
              </p>
            )}

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Docs.</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fiscalRows.map((row, index) => (
                  <TableRow key={`${row.month}-${row.documentKind}-${row.status}-${index}`}>
                    <TableCell>
                      <span className="flex flex-col">
                        <span>{FISCAL_DOCUMENT_KIND_LABELS[row.documentKind]}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.ncfType} · {formatCivilMonth(monthKey(row.month))}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge meta={FISCAL_DOC_STATUS_META[row.status]} />
                    </TableCell>
                    <TableCell className="num text-right">
                      {formatNumber(row.documentCount)}
                    </TableCell>
                    <TableCell className="num text-right">
                      {formatMoney(row.totalAmountConverted, REPORT_CURRENCY)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ReportCard>
      </div>

      <MonthRangeFilter
        value={fiscalFilters}
        onChange={(next) => setFiscalFilters({ ...fiscalFilters, ...next })}
      >
        <FilterSelect
          value={fiscalFilters.documentKind}
          onChange={(value) =>
            setFiscalFilters({
              ...fiscalFilters,
              documentKind: value as FiscalDocumentKind,
            })
          }
          placeholder="Documento"
          allLabel="Facturas y notas"
          options={FISCAL_DOCUMENT_KINDS.map((kind) => ({
            value: kind,
            label: FISCAL_DOCUMENT_KIND_LABELS[kind],
          }))}
        />
        <FilterSelect
          value={fiscalFilters.status}
          onChange={(value) =>
            setFiscalFilters({
              ...fiscalFilters,
              status: value as FiscalDocStatus,
            })
          }
          placeholder="Estado"
          allLabel="Todos los estados"
          options={FISCAL_DOC_STATUSES.map((status) => ({
            value: status,
            label: FISCAL_DOC_STATUS_META[status].label,
          }))}
        />
        <FilterSelect
          value={fiscalFilters.ncfType}
          onChange={(value) => setFiscalFilters({ ...fiscalFilters, ncfType: value as NcfType })}
          placeholder="Tipo"
          allLabel="Todos los tipos"
          options={INVOICE_NCF_TYPES.map((type) => ({
            value: type,
            label: `${type} · ${NCF_TYPE_LABELS[type]}`,
          }))}
        />
      </MonthRangeFilter>

      <ReportCard
        title="Facturacion por mes"
        description={`Emitido y acreditado, consolidado en ${REPORT_CURRENCY}.`}
        isLoading={fiscal.isLoading}
        isError={fiscal.isError}
        error={fiscal.error}
        onRetry={() => void fiscal.refetch()}
        isEmpty={fiscalPorMes.length === 0}
      >
        <PrintChart height={300}>
          <BarChart data={fiscalPorMes} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
              formatter={(value: number, name: string) => [
                formatMoney(value, REPORT_CURRENCY),
                name,
              ]}
            />
            <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
            <Bar
              dataKey="facturas"
              name="Facturas"
              fill={seriesColor(0)}
              radius={[3, 3, 0, 0]}
              isAnimationActive={isAnimationActive}
            />
            <Bar
              isAnimationActive={isAnimationActive}
              dataKey="notas"
              name="Notas de credito"
              fill={seriesColor(3)}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </PrintChart>
      </ReportCard>
    </div>
  );
}
