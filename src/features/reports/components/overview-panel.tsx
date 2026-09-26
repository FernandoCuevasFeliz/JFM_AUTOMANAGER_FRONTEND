import * as React from 'react';
import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';
import { PrintChart } from '@/components/print-chart';
import {
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  useChartStyles,
} from '@/lib/chart-theme';
import { formatNumber } from '@/lib/money';
import { VEHICLE_STATUS_META, type VehicleStatus } from '@/lib/status';
import { ReportCard, ReportTotals } from './report-shell';
import { useInventoryStatusReport } from '../hooks';

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
  const { legendStyle, isAnimationActive } = useChartStyles();

  const inventory = useInventoryStatusReport();

  const inventoryRows = inventory.data ?? [];

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
        ]}
      />

      <div className="print-stack grid gap-4">
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
                itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                formatter={(value: number, name: string) => [`${value} unidades`, name]}
              />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
            </PieChart>
          </PrintChart>
        </ReportCard>

      </div>
    </div>
  );
}
