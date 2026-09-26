import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/data-table';
import { FilterBar, FilterSelect, SearchInput } from '@/components/filter-bar';
import { EmptyState, NoResultsState } from '@/components/states';
import { useAuth } from '@/features/auth/use-auth';
import { VehicleStatusBadge } from '@/features/vehicles/components/vehicle-status-badge';
import { formatCivilDate } from '@/lib/dates';
import { formatMoney, formatNumber, formatPercentage } from '@/lib/money';
import { VEHICLE_STATUSES, VEHICLE_STATUS_META, type VehicleStatus } from '@/lib/status';
import { useListParams } from '@/lib/use-list-params';
import { cn } from '@/lib/utils';
import { ReportForbidden, ReportTotals } from './report-shell';
import { useVehicleProfitability } from '../hooks';
import { REPORT_CURRENCY, sumConverted, type VehicleProfitability } from '../types';

interface Filters {
  search: string;
  status: VehicleStatus | undefined;
  sold: string | undefined;
}

const INITIAL: Filters = { search: '', status: undefined, sold: undefined };

/**
 * Rentabilidad unidad por unidad.
 *
 * Exige `expenses:read` ademas de `reports:read`: expone el costo de
 * adquisicion y el margen, que un vendedor no necesita para vender.
 */
export function ProfitabilityPanel() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<Filters>(INITIAL);

  // `sold` viaja como texto en el selector y como booleano en la query.
  const params = React.useMemo(
    () => ({
      ...query,
      sold: filters.sold === undefined ? undefined : filters.sold === 'true',
    }),
    [query, filters.sold],
  );

  const report = useVehicleProfitability(params);
  const rows = report.data?.data ?? [];

  const columns = React.useMemo<ColumnDef<VehicleProfitability, unknown>[]>(
    () => [
      {
        id: 'vehicle',
        header: 'Unidad',
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">
              {row.original.brandName} {row.original.modelName} {row.original.year}
            </span>
            <span className="num text-xs text-muted-foreground">{row.original.chassisNumber}</span>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => <VehicleStatusBadge status={row.original.status} />,
      },
      {
        id: 'cost',
        header: 'Costo total',
        cell: ({ row }) => (
          <div className="flex flex-col text-right">
            <span className="num">
              {formatMoney(row.original.totalCostConverted, REPORT_CURRENCY)}
            </span>
            <span className="num text-xs text-muted-foreground">
              + {formatMoney(row.original.expensesTotalConverted, REPORT_CURRENCY)} gastos
            </span>
          </div>
        ),
      },
      {
        id: 'sold',
        header: 'Vendido en',
        cell: ({ row }) => {
          const { soldPriceConverted, saleNumber, saleDate } = row.original;
          if (soldPriceConverted === null) {
            return <span className="text-sm text-muted-foreground">En stock</span>;
          }

          return (
            <div className="flex flex-col text-right">
              <span className="num">{formatMoney(soldPriceConverted, REPORT_CURRENCY)}</span>
              <span className="num text-xs text-muted-foreground">
                {saleNumber} · {saleDate ? formatCivilDate(saleDate) : '—'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'margin',
        header: 'Margen',
        cell: ({ row }) => {
          const { margin, marginPercentage } = row.original;
          // Sin venta no hay margen: no es cero, es que todavia no se sabe.
          if (margin === null) return <span className="text-muted-foreground">—</span>;

          const positivo = margin >= 0;
          return (
            <div className="flex flex-col text-right">
              <span className={cn('num font-medium', positivo ? 'text-success' : 'text-danger')}>
                {formatMoney(margin, REPORT_CURRENCY)}
              </span>
              {marginPercentage !== null && (
                <span className={cn('num text-xs', positivo ? 'text-success' : 'text-danger')}>
                  {formatPercentage(marginPercentage)}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [],
  );

  if (!can('expenses:read')) {
    return <ReportForbidden needs="expenses:read" />;
  }

  // Totales de la PAGINA visible, no de todo el reporte: el backend pagina y no
  // devuelve un agregado global. Decirlo evita que se lea como el total del mes.
  const vendidas = rows.filter((row) => row.margin !== null);
  const costoPagina = sumConverted(rows, (row) => row.totalCostConverted);
  const margenPagina = sumConverted(vendidas, (row) => row.margin ?? 0);
  const ingresoPagina = sumConverted(vendidas, (row) => row.soldPriceConverted ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <FilterBar showClear={hasActiveFilters} onClear={resetFilters} className="print:hidden">
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Chasis, marca o modelo…"
        />

        <FilterSelect
          value={filters.status}
          onChange={(value) => setFilter('status', value as VehicleStatus | undefined)}
          placeholder="Estado"
          allLabel="Todos los estados"
          options={VEHICLE_STATUSES.map((status) => ({
            value: status,
            label: VEHICLE_STATUS_META[status].label,
          }))}
        />

        <FilterSelect
          value={filters.sold}
          onChange={(value) => setFilter('sold', value)}
          placeholder="Venta"
          allLabel="Vendidas y en stock"
          options={[
            { value: 'true', label: 'Solo vendidas' },
            { value: 'false', label: 'Solo en stock' },
          ]}
        />
      </FilterBar>

      <ReportTotals
        items={[
          { label: 'Unidades en pagina', value: formatNumber(rows.length) },
          { label: 'Costo (pagina)', value: formatMoney(costoPagina, REPORT_CURRENCY) },
          { label: 'Ingreso (pagina)', value: formatMoney(ingresoPagina, REPORT_CURRENCY) },
          {
            label: 'Margen (pagina)',
            value: formatMoney(margenPagina, REPORT_CURRENCY),
            tone: margenPagina >= 0 ? 'positive' : 'danger',
          },
        ]}
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        Los totales corresponden a las unidades de esta pagina, no a todo el reporte. Importes
        consolidados en {REPORT_CURRENCY} con la tasa registrada en cada compra y cada venta.
      </p>

      <DataTable
        columns={columns}
        data={rows}
        meta={report.data?.meta}
        isLoading={report.isLoading}
        isFetching={report.isFetching}
        isError={report.isError}
        error={report.error}
        onRetry={() => void report.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={(row) => navigate(`/vehicles/${row.vehicleId}`)}
        resourceLabel="unidades"
        emptyState={
          hasActiveFilters ? (
            <NoResultsState onClear={resetFilters} />
          ) : (
            <EmptyState
              title="Sin unidades"
              description="Todavia no hay vehiculos con costo registrado."
            />
          )
        }
      />
    </div>
  );
}
