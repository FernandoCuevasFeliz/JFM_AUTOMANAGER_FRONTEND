import {
  BadgeDollarSign,
  BookMarked,
  Car,
  FileText,
  ChartColumn,
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  UserCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Navegacion del panel.
 *
 * Cada item declara el permiso que lo habilita. El sidebar filtra por
 * `can(permission)`, nunca por nombre de rol: si manana cambia el mapa de
 * permisos del backend, el menu se ajusta solo (§3 de API.md).
 */

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission: string;
  /** Marca la ruta activa solo en coincidencia exacta (el tablero, en `/`). */
  end?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'General',
    items: [
      {
        label: 'Tablero',
        to: '/',
        icon: LayoutDashboard,
        permission: 'reports:read',
        end: true,
      },
      {
        label: 'Reportes',
        to: '/reports',
        icon: ChartColumn,
        permission: 'reports:read',
      },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Vehiculos', to: '/vehicles', icon: Car, permission: 'vehicles:read' },
      { label: 'Compras', to: '/purchases', icon: ShoppingCart, permission: 'purchases:read' },
      { label: 'Proveedores', to: '/suppliers', icon: Truck, permission: 'suppliers:read' },
      { label: 'Gastos', to: '/expenses', icon: Receipt, permission: 'expenses:read' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { label: 'Clientes', to: '/clients', icon: Users, permission: 'clients:read' },
      { label: 'Cotizaciones', to: '/quotations', icon: FileText, permission: 'quotations:read' },
      { label: 'Reservas', to: '/reservations', icon: BookMarked, permission: 'reservations:read' },
      { label: 'Ventas', to: '/sales', icon: BadgeDollarSign, permission: 'sales:read' },
    ],
  },
  {
    label: 'Administracion',
    items: [
      { label: 'Catalogos', to: '/catalogs', icon: Tags, permission: 'catalogs:read' },
      { label: 'Usuarios', to: '/users', icon: UserCog, permission: 'users:read' },
    ],
  },
];

/** Icono de marca del panel. */
export const BRAND_ICON = Car;
