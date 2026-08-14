import { lazy } from 'react';
import { Link, createBrowserRouter } from 'react-router-dom';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { LoginPage } from '@/features/auth/pages/login-page';
import { AppShell } from './layout/app-shell';
import { RequireAuth, RequirePermission } from './guards';

/**
 * Rutas de la aplicacion.
 *
 * Todo lo que cuelga de `RequireAuth` exige sesion; cada modulo se envuelve
 * ademas en `RequirePermission` con el permiso de lectura que pide el backend
 * (§5 de API.md). Es una comodidad de UX: el servidor revalida cada peticion.
 *
 * Los modulos se cargan de forma perezosa: un usuario del rol `ventas` nunca
 * descarga el codigo de compras o de usuarios. El login queda en el bundle
 * inicial porque es la primera pantalla que se ve. `<Suspense>` vive en
 * `AppShell`, alrededor del `<Outlet/>`.
 */
const DashboardPage = lazyPage(() => import('@/features/dashboard/pages/dashboard-page'), 'DashboardPage');
const VehiclesListPage = lazyPage(() => import('@/features/vehicles/pages/vehicles-list-page'), 'VehiclesListPage');
const VehicleDetailPage = lazyPage(() => import('@/features/vehicles/pages/vehicle-detail-page'), 'VehicleDetailPage');
const VehicleNewPage = lazyPage(() => import('@/features/vehicles/pages/vehicle-new-page'), 'VehicleNewPage');
const VehicleEditPage = lazyPage(() => import('@/features/vehicles/pages/vehicle-edit-page'), 'VehicleEditPage');
const ClientsListPage = lazyPage(() => import('@/features/clients/pages/clients-list-page'), 'ClientsListPage');
const SuppliersListPage = lazyPage(() => import('@/features/suppliers/pages/suppliers-list-page'), 'SuppliersListPage');
const PurchasesListPage = lazyPage(() => import('@/features/purchases/pages/purchases-list-page'), 'PurchasesListPage');
const PurchaseDetailPage = lazyPage(() => import('@/features/purchases/pages/purchase-detail-page'), 'PurchaseDetailPage');
const PurchaseNewPage = lazyPage(() => import('@/features/purchases/pages/purchase-form-pages'), 'PurchaseNewPage');
const PurchaseEditPage = lazyPage(() => import('@/features/purchases/pages/purchase-form-pages'), 'PurchaseEditPage');
const ExpensesListPage = lazyPage(() => import('@/features/expenses/pages/expenses-list-page'), 'ExpensesListPage');
const QuotationsListPage = lazyPage(() => import('@/features/quotations/pages/quotations-list-page'), 'QuotationsListPage');
const ReservationsListPage = lazyPage(() => import('@/features/reservations/pages/reservations-list-page'), 'ReservationsListPage');
const SalesListPage = lazyPage(() => import('@/features/sales/pages/sales-list-page'), 'SalesListPage');
const SaleDetailPage = lazyPage(() => import('@/features/sales/pages/sale-detail-page'), 'SaleDetailPage');
const SaleNewPage = lazyPage(() => import('@/features/sales/pages/sale-new-page'), 'SaleNewPage');
const InvoicePage = lazyPage(() => import('@/features/billing/pages/invoice-page'), 'InvoicePage');
const CatalogsPage = lazyPage(() => import('@/features/catalogs/pages/catalogs-page'), 'CatalogsPage');
const UsersListPage = lazyPage(() => import('@/features/users/pages/users-list-page'), 'UsersListPage');
const ChangePasswordPage = lazyPage(() => import('@/features/auth/pages/change-password-page'), 'ChangePasswordPage');
const SessionsPage = lazyPage(() => import('@/features/auth/pages/sessions-page'), 'SessionsPage');

/** `React.lazy` sobre un export con nombre en vez de un `default`. */
function lazyPage<T extends string>(
  loader: () => Promise<Record<T, React.ComponentType>>,
  name: T,
) {
  return lazy(async () => ({ default: (await loader())[name] }));
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          // --- Tablero -----------------------------------------------------
          {
            element: <RequirePermission permission="reports:read" />,
            children: [{ index: true, element: <DashboardPage /> }],
          },

          // --- Vehiculos ----------------------------------------------------
          {
            element: <RequirePermission permission="vehicles:read" />,
            children: [
              { path: 'vehicles', element: <VehiclesListPage /> },
              { path: 'vehicles/:id', element: <VehicleDetailPage /> },
            ],
          },
          {
            element: <RequirePermission permission="vehicles:write" />,
            children: [
              { path: 'vehicles/new', element: <VehicleNewPage /> },
              { path: 'vehicles/:id/edit', element: <VehicleEditPage /> },
            ],
          },

          // --- Clientes -----------------------------------------------------
          {
            element: <RequirePermission permission="clients:read" />,
            children: [{ path: 'clients', element: <ClientsListPage /> }],
          },

          // --- Proveedores --------------------------------------------------
          {
            element: <RequirePermission permission="suppliers:read" />,
            children: [{ path: 'suppliers', element: <SuppliersListPage /> }],
          },

          // --- Compras ------------------------------------------------------
          {
            element: <RequirePermission permission="purchases:read" />,
            children: [
              { path: 'purchases', element: <PurchasesListPage /> },
              { path: 'purchases/:id', element: <PurchaseDetailPage /> },
            ],
          },
          {
            element: <RequirePermission permission="purchases:write" />,
            children: [
              { path: 'purchases/new', element: <PurchaseNewPage /> },
              { path: 'purchases/:id/edit', element: <PurchaseEditPage /> },
            ],
          },

          // --- Gastos -------------------------------------------------------
          {
            element: <RequirePermission permission="expenses:read" />,
            children: [{ path: 'expenses', element: <ExpensesListPage /> }],
          },

          // --- Cotizaciones -------------------------------------------------
          {
            element: <RequirePermission permission="quotations:read" />,
            children: [{ path: 'quotations', element: <QuotationsListPage /> }],
          },

          // --- Reservas -----------------------------------------------------
          {
            element: <RequirePermission permission="reservations:read" />,
            children: [{ path: 'reservations', element: <ReservationsListPage /> }],
          },

          // --- Ventas -------------------------------------------------------
          {
            element: <RequirePermission permission="sales:read" />,
            children: [
              { path: 'sales', element: <SalesListPage /> },
              { path: 'sales/:id', element: <SaleDetailPage /> },
              // La factura es una vista de la venta, no un recurso aparte: la
              // protege el mismo permiso y cuelga de la misma ruta.
              { path: 'sales/:id/invoice', element: <InvoicePage /> },
            ],
          },
          {
            element: <RequirePermission permission="sales:write" />,
            children: [{ path: 'sales/new', element: <SaleNewPage /> }],
          },

          // --- Catalogos ----------------------------------------------------
          {
            element: <RequirePermission permission="catalogs:read" />,
            children: [{ path: 'catalogs', element: <CatalogsPage /> }],
          },

          // --- Usuarios -----------------------------------------------------
          {
            element: <RequirePermission permission="users:read" />,
            children: [{ path: 'users', element: <UsersListPage /> }],
          },

          // --- Cuenta propia: basta con estar autenticado --------------------
          { path: 'account/password', element: <ChangePasswordPage /> },
          { path: 'account/sessions', element: <SessionsPage /> },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

function NotFoundPage() {
  return (
    <EmptyState
      title="Pagina no encontrada"
      description="La direccion a la que intentas entrar no existe."
      action={
        <Button asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      }
      className="min-h-[60vh]"
    />
  );
}
