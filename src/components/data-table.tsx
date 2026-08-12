import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type * as React from 'react';
import { ErrorState, TableSkeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PageMeta } from '@/lib/api-types';
import { formatNumber } from '@/lib/money';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  /** Paginacion real del servidor; la tabla nunca recorta filas por su cuenta. */
  meta?: PageMeta;
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** Que mostrar cuando no hay filas (vacio real o vacio por filtros). */
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  /** Etiqueta del recurso en singular/plural para el pie ("12 vehiculos"). */
  resourceLabel?: string;
}

/**
 * Tabla de listado del panel.
 *
 * `manualPagination` porque el backend ya devuelve la pagina pedida y su `meta`:
 * TanStack Table solo dibuja, no recorta. Los filtros tambien viajan al
 * servidor, no se aplican sobre la pagina en memoria.
 *
 * No hay ordenamiento por columna: ningun listado de la API acepta un parametro
 * de orden, y ordenar solo la pagina visible daria un resultado enganoso.
 */
export function DataTable<TData>({
  columns,
  data,
  meta,
  isLoading = false,
  isFetching = false,
  isError = false,
  error,
  onRetry,
  onPageChange,
  onPageSizeChange,
  emptyState,
  onRowClick,
  resourceLabel = 'registros',
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
    pageCount: meta?.totalPages ?? -1,
  });

  const page = meta?.page ?? 1;
  const totalPages = meta?.totalPages ?? 0;
  const total = meta?.total ?? 0;

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <TableSkeleton columns={columns.length} />
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="rounded-xl border border-border bg-card">{emptyState}</div>;
  }

  const from = (page - 1) * (meta?.pageSize ?? data.length) + 1;
  const to = Math.min(page * (meta?.pageSize ?? data.length), total);

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border bg-card transition-opacity',
          // Al cambiar de pagina o filtro se atenua en vez de vaciarse.
          isFetching && 'opacity-60',
        )}
      >
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {meta && (
        <div className="flex flex-col-reverse items-start justify-between gap-3 px-1 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            Mostrando <span className="font-medium text-foreground">{formatNumber(from)}</span>–
            <span className="font-medium text-foreground">{formatNumber(to)}</span> de{' '}
            <span className="font-medium text-foreground">{formatNumber(total)}</span> {resourceLabel}
          </p>

          <div className="flex items-center gap-4">
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Por pagina</span>
                <Select
                  value={String(meta.pageSize)}
                  onValueChange={(value) => onPageSizeChange(Number(value))}
                >
                  <SelectTrigger className="h-8 w-18">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Pagina {page} de {Math.max(totalPages, 1)}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => onPageChange?.(page - 1)}
                disabled={page <= 1 || isFetching}
                aria-label="Pagina anterior"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => onPageChange?.(page + 1)}
                disabled={page >= totalPages || isFetching}
                aria-label="Pagina siguiente"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
