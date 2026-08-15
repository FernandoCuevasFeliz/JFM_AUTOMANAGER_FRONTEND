import {
  ChevronDown,
  KeyRound,
  Loader2,
  LogOut,
  Menu,
  MonitorSmartphone,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import * as React from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/brand-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/use-auth';
import { useTheme } from '@/lib/use-theme';
import { roleAccent, roleAccentStyle, userAccent } from '@/lib/user-accent';
import { cn } from '@/lib/utils';
import { BRAND_ICON, NAV_GROUPS } from './sidebar-nav';

/**
 * Marco de la aplicacion: sidebar fijo en escritorio, cajon deslizante en
 * movil, topbar con el usuario y `<Outlet/>` para el modulo activo.
 *
 * El sidebar es grafito oscuro en los dos temas. Es deliberado: fija el ancla
 * visual del producto y deja que el area de trabajo —donde de verdad se leen
 * datos— se quede con todo el contraste disponible.
 */
export function AppShell() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Navegar cierra el cajon: en movil queda tapando el contenido.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Escape cierra el cajon: es lo que espera cualquiera que lo abra sin querer.
  React.useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const groups = React.useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => can(item.permission)),
      })).filter((group) => group.items.length > 0),
    [can],
  );

  // Titulo del modulo activo: orienta sin obligar a mirar el sidebar.
  const currentSection = React.useMemo(() => {
    const items = groups.flatMap((group) => group.items);
    const matches = items.filter((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
    );
    // Con `/vehicles` y `/vehicles/new` gana la ruta mas especifica.
    return matches.sort((a, b) => b.to.length - a.to.length)[0];
  }, [groups, location.pathname]);

  // Dos señales distintas y complementarias: el color del USUARIO identifica a
  // la persona (avatar, tablero) y el del ROL tiñe el sidebar para que se vea
  // desde cualquier pantalla con que permisos se esta trabajando.
  const accent = userAccent(user?.id);
  const role = roleAccent(user?.roleName);

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : '?';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Fondo oscuro del cajon en movil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-sidebar',
          'transition-transform duration-250 ease-out lg:translate-x-0',
          // Al papel solo va el documento, nunca el cromo de la aplicacion.
          'print:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Navegacion principal"
        style={roleAccentStyle(user?.roleName)}
      >
        {/*
          Marca en dos pisos: arriba el logo de la empresa, centrado en el ancho
          del sidebar; debajo, el identificador del sistema. Responden a
          preguntas distintas —de quien es el negocio y que herramienta usas— y
          por eso conviven en vez de sustituirse.
        */}
        <div className="relative flex flex-col items-center gap-3.5 border-b border-sidebar-border px-4 py-5">
          <Link
            to="/"
            className="flex flex-col items-center gap-3.5 rounded-md"
            aria-label="JFM AutoManager · ir al tablero"
          >
            <BrandLogo variant="light" height={46} priority />

            <span className="flex items-center gap-2.5">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-white shadow-xs"
                style={{ backgroundColor: role.rail }}
              >
                <BRAND_ICON className="size-4.5" aria-hidden />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[15px] font-bold tracking-tight text-sidebar-accent-foreground">
                  JFM<span className="font-normal text-sidebar-foreground"> AutoManager</span>
                </span>
                <span className="label-micro mt-1 text-sidebar-muted">EJGH Auto Import</span>
              </span>
            </span>
          </Link>

          <button
            type="button"
            className="hit-target absolute right-3 top-3 flex size-8 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="label-micro mb-1.5 px-3 text-sidebar-muted">{group.label}</p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          'relative flex h-9 items-center gap-3 rounded-md pl-4 pr-3 text-[13.5px] font-medium',
                          'transition-colors duration-150',
                          // Riel rojo de 3px: marca la posicion sin depender solo
                          // del relleno, que en oscuro se lee muy debil.
                          'before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px]',
                          'before:-translate-y-1/2 before:rounded-r-full before:transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground before:bg-[var(--role-rail)]'
                            : 'text-sidebar-foreground before:bg-transparent hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground',
                        )
                      }
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t border-sidebar-border px-4 py-3">
          <span className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: role.rail }}
              aria-hidden
            />
            <span className="label-micro text-sidebar-accent-foreground">{role.label}</span>
          </span>
          <p className="label-micro text-sidebar-muted">JFM AutoManager · v1.0</p>
        </div>
      </aside>

      <div className="lg:pl-[264px] print:pl-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6 print:hidden">
          <button
            type="button"
            className="hit-target flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-4.5" />
          </button>

          {currentSection && (
            <p className="truncate text-sm font-semibold tracking-tight">{currentSection.label}</p>
          )}

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="hit-target flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hit-target flex cursor-pointer items-center gap-2 rounded-md py-1 pl-1 pr-2 text-left transition-colors hover:bg-accent">
                  <Avatar>
                    <AvatarFallback
                      className="text-white"
                      style={{ backgroundColor: accent.color }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden flex-col leading-tight sm:flex">
                    <span className="text-[13px] font-medium">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="label-micro text-muted-foreground">{user?.roleName}</span>
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/account/password">
                    <KeyRound />
                    Cambiar contrasena
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/sessions">
                    <MonitorSmartphone />
                    Sesiones activas
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => void handleLogout()}>
                  <LogOut />
                  Cerrar sesion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0">
          {/* Cada modulo llega en su propio chunk: ver `router.tsx`. */}
          <React.Suspense fallback={<RouteFallback />}>
            <Outlet />
          </React.Suspense>
        </main>
      </div>
    </div>
  );
}

/** Espera breve mientras se descarga el chunk del modulo. */
function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Cargando" />
    </div>
  );
}
