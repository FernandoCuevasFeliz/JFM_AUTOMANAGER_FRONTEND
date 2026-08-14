import { Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DetailAmount, DetailCard, DetailGrid, DetailItem } from '@/components/detail-view';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { formatCivilDate, formatDateTime } from '@/lib/dates';
import { convertToReporting, formatExchangeRate, formatMoney, isReportingCurrency } from '@/lib/money';
import { EXPENSE_SCOPE_META } from '@/lib/status';
import { ExpenseFormDialog } from '../components/expense-form-dialog';
import { useDeleteExpense, useExpense } from '../hooks';

export function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();

  const expenseQuery = useExpense(id);
  const deleteExpense = useDeleteExpense();

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  if (expenseQuery.isLoading) return <DetailSkeleton />;

  if (expenseQuery.isError || !expenseQuery.data) {
    return <ErrorState error={expenseQuery.error} onRetry={() => void expenseQuery.refetch()} />;
  }

  const expense = expenseQuery.data;
  const enPesos = isReportingCurrency(expense.currencyCode);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Gasto"
        title={expense.description}
        description={`${expense.categoryName} · ${formatCivilDate(expense.expenseDate)}`}
        backTo="/expenses"
        backLabel="Gastos"
        actions={
          <>
            {can('expenses:write') && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil />
                Editar
              </Button>
            )}
            {can('expenses:delete') && (
              <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Eliminar
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge meta={EXPENSE_SCOPE_META[expense.categoryScope]} />
        <span className="text-sm text-muted-foreground">{expense.categoryName}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DetailCard title="Detalle del gasto" className="lg:col-span-2">
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailAmount
                label="Importe"
                value={formatMoney(expense.amount, expense.currencyCode)}
              />
              {/* Con moneda extranjera, el equivalente en pesos evita tener que
                  hacer la cuenta a mano para comparar con el resto del gasto. */}
              {!enPesos && (
                <DetailAmount
                  label="Equivalente en DOP"
                  value={formatMoney(
                    convertToReporting(expense.amount, expense.exchangeRate),
                    'DOP',
                  )}
                />
              )}
            </div>

            <DetailGrid>
              <DetailItem label="Descripcion" value={expense.description} className="sm:col-span-2" />
              <DetailItem label="Categoria" value={expense.categoryName} />
              <DetailItem
                label="Alcance"
                value={EXPENSE_SCOPE_META[expense.categoryScope].label}
              />
              <DetailItem label="Fecha" value={formatCivilDate(expense.expenseDate)} numeric />
              <DetailItem label="Metodo de pago" value={expense.paymentMethodName} />
              <DetailItem label="Moneda" value={expense.currencyCode} numeric />
              <DetailItem
                label="Tasa de cambio"
                value={formatExchangeRate(expense.exchangeRate)}
                numeric
              />
              <DetailItem label="Registrado por" value={expense.createdByName} />
              <DetailItem label="Alta" value={formatDateTime(expense.createdAt)} numeric />
            </DetailGrid>
          </div>
        </DetailCard>

        <DetailCard title="Imputacion">
          {expense.vehicleId ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Este gasto suma al costo real de una unidad concreta.
              </p>
              <DetailItem label="Vehiculo">
                <Link
                  to={`/vehicles/${expense.vehicleId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {expense.vehicleChassisNumber}
                </Link>
              </DetailItem>
              {can('reports:read') && (
                <Button variant="outline" size="sm" asChild className="w-fit">
                  <Link to={`/vehicles/${expense.vehicleId}`}>Ver costo de la unidad</Link>
                </Button>
              )}
            </div>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Gasto general de la empresa. No se imputa a ninguna unidad, asi que no afecta al costo
              ni al margen de ningun vehiculo.
            </p>
          )}
        </DetailCard>
      </div>

      <ExpenseFormDialog expense={expense} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar gasto"
        description="El gasto desaparece de los listados y deja de sumar al costo de la unidad. Su historial se conserva."
        confirmLabel="Eliminar"
        destructive
        loading={deleteExpense.isPending}
        onConfirm={() => {
          deleteExpense.mutate(expense.id, { onSuccess: () => navigate('/expenses') });
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}
