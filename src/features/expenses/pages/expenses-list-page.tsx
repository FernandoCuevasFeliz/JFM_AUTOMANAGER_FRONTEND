import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { FilterBar, FilterSelect, SearchInput } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { EmptyState, NoResultsState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/use-auth';
import { useExpenseCategories, usePaymentMethods } from '@/features/catalogs/hooks';
import { formatCivilDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { EXPENSE_SCOPE_META } from '@/lib/status';
import { useListParams } from '@/lib/use-list-params';
import { ExpenseFormDialog } from '../components/expense-form-dialog';
import { useDeleteExpense, useExpenses } from '../hooks';
import type { Expense } from '../types';

interface ExpenseFilters {
  search: string;
  categoryId: string | undefined;
  paymentMethodId: string | undefined;
  generalOnly: boolean | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
}

const INITIAL_FILTERS: ExpenseFilters = {
  search: '',
  categoryId: undefined,
  paymentMethodId: undefined,
  generalOnly: undefined,
  dateFrom: undefined,
  dateTo: undefined,
};

export function ExpensesListPage() {
  const { can } = useAuth();
  const { filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<ExpenseFilters>(INITIAL_FILTERS);

  const expensesQuery = useExpenses(query);
  const deleteExpense = useDeleteExpense();
  const categories = useExpenseCategories();
  const paymentMethods = usePaymentMethods();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | undefined>();
  const [deleteTarget, setDeleteTarget] = React.useState<Expense | null>(null);

  const canWrite = can('expenses:write');
  const canDelete = can('expenses:delete');

  const columns = React.useMemo<ColumnDef<Expense, unknown>[]>(
    () => [
      {
        id: 'expenseDate',
        header: 'Fecha',
        // Fecha civil: se formatea como texto, nunca con `new Date(...)`.
        cell: ({ row }) => <span className="tabular">{formatCivilDate(row.original.expenseDate)}</span>,
      },
      {
        id: 'description',
        header: 'Descripcion',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.description}</span>
            <span className="text-xs text-muted-foreground">{row.original.categoryName}</span>
          </div>
        ),
      },
      {
        id: 'scope',
        header: 'Imputacion',
        cell: ({ row }) => {
          const expense = row.original;
          if (!expense.vehicleId) {
            return <StatusBadge meta={EXPENSE_SCOPE_META.general} />;
          }

          return (
            <Link
              to={`/vehicles/${expense.vehicleId}`}
              className="font-mono text-[13px] text-primary hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {expense.vehicleChassisNumber ?? 'Ver unidad'}
            </Link>
          );
        },
      },
      {
        id: 'paymentMethod',
        header: 'Metodo',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.paymentMethodName}</span>
        ),
      },
      {
        id: 'amount',
        header: 'Monto',
        cell: ({ row }) => (
          <span className="tabular font-medium">
            {formatMoney(row.original.amount, row.original.currencyCode)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          if (!canWrite && !canDelete) return null;

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canWrite && (
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(row.original);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setDeleteTarget(row.original)}>
                        <Trash2 />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [canWrite, canDelete],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gastos"
        description="Costos imputados a una unidad y gastos generales de la empresa."
        actions={
          canWrite && (
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus />
              Nuevo gasto
            </Button>
          )
        }
      />

      <FilterBar showClear={hasActiveFilters} onClear={resetFilters}>
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Descripcion, categoria o chasis…"
        />

        <FilterSelect
          value={filters.categoryId}
          onChange={(value) => setFilter('categoryId', value)}
          placeholder="Categoria"
          allLabel="Todas las categorias"
          options={categories.map((item) => ({ value: item.id, label: item.name }))}
        />

        <FilterSelect
          value={filters.generalOnly === undefined ? undefined : String(filters.generalOnly)}
          onChange={(value) =>
            setFilter('generalOnly', value === undefined ? undefined : value === 'true')
          }
          placeholder="Imputacion"
          allLabel="Todos los gastos"
          options={[
            { value: 'true', label: 'Solo generales' },
            { value: 'false', label: 'Solo por vehiculo' },
          ]}
        />

        <FilterSelect
          value={filters.paymentMethodId}
          onChange={(value) => setFilter('paymentMethodId', value)}
          placeholder="Metodo de pago"
          allLabel="Todos los metodos"
          options={paymentMethods.map((item) => ({ value: item.id, label: item.name }))}
        />

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(event) => setFilter('dateFrom', event.target.value || undefined)}
            className="w-40"
            aria-label="Desde"
          />
          <span className="text-sm text-muted-foreground">a</span>
          <Input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(event) => setFilter('dateTo', event.target.value || undefined)}
            className="w-40"
            aria-label="Hasta"
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={expensesQuery.data?.data ?? []}
        meta={expensesQuery.data?.meta}
        isLoading={expensesQuery.isLoading}
        isFetching={expensesQuery.isFetching}
        isError={expensesQuery.isError}
        error={expensesQuery.error}
        onRetry={() => void expensesQuery.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        resourceLabel="gastos"
        emptyState={
          hasActiveFilters ? (
            <NoResultsState onClear={resetFilters} />
          ) : (
            <EmptyState
              icon={Receipt}
              title="Todavia no hay gastos"
              description="Registra los costos de nacionalizacion, transporte y demas para conocer el costo real de cada unidad."
              action={
                canWrite && (
                  <Button
                    onClick={() => {
                      setEditing(undefined);
                      setFormOpen(true);
                    }}
                  >
                    Nuevo gasto
                  </Button>
                )
              }
            />
          )
        }
      />

      <ExpenseFormDialog expense={editing} open={formOpen} onOpenChange={setFormOpen} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar gasto"
        description={
          <>
            Se eliminara <strong>{deleteTarget?.description}</strong>. Si estaba imputado a una
            unidad, su costo real se recalculara sin el.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        loading={deleteExpense.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteExpense.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
