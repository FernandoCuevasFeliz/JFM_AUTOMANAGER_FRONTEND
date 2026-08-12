import * as React from 'react';

/**
 * Estado de los filtros y la paginacion de un listado.
 *
 * Cambiar un filtro vuelve siempre a la pagina 1: la pagina 3 de un resultado
 * distinto no significa nada y suele acabar en una tabla vacia.
 */
export function useListParams<TFilters extends object>(
  initialFilters: TFilters,
  initialPageSize = 20,
) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSizeState] = React.useState(initialPageSize);
  const [filters, setFilters] = React.useState<TFilters>(initialFilters);

  const setFilter = React.useCallback(
    <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
      setFilters((previous) => ({ ...previous, [key]: value }) as TFilters);
      setPage(1);
    },
    [],
  );

  const setPageSize = React.useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const resetFilters = React.useCallback(() => {
    setFilters(initialFilters);
    setPage(1);
    // `initialFilters` es un literal estable definido en el modulo que lo usa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ¿Hay algun filtro activo? Distingue "vacio" de "sin resultados". */
  const hasActiveFilters = React.useMemo(
    () =>
      Object.entries(filters).some(([key, value]) => {
        const initial = initialFilters[key as keyof TFilters];
        if (Array.isArray(value)) return value.length > 0;
        return value !== initial && value !== undefined && value !== '';
      }),
    [filters, initialFilters],
  );

  const query = React.useMemo(
    () => ({ page, pageSize, ...filters }),
    [page, pageSize, filters],
  );

  return {
    page,
    pageSize,
    filters,
    query,
    hasActiveFilters,
    setPage,
    setPageSize,
    setFilter,
    resetFilters,
  };
}

/** Retrasa un valor para no disparar una peticion por cada tecla. */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
