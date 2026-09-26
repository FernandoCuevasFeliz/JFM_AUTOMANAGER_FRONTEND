import { Printer } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { PrintLetterfoot, PrintLetterhead } from '@/components/print-letterhead';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/use-auth';
import { COMPANY } from '@/features/billing/company';
import { formatDateTime } from '@/lib/dates';
import { imprimirPagina } from '@/lib/use-print-mode';
import { ExpensesPanel } from '../components/expenses-panel';
import { OverviewPanel } from '../components/overview-panel';
import { ProfitabilityPanel } from '../components/profitability-panel';
import { ReceivablePanel } from '../components/receivable-panel';
import { SalesPanel } from '../components/sales-panel';

/**
 * Reportes.
 *
 * Una sola ruta con pestañas en vez de siete entradas de menu: son vistas del
 * mismo negocio y se comparan entre si. La pestaña activa viaja en `?tab=` para
 * que un reporte se pueda enviar por enlace.
 *
 * Todas exigen `reports:read`, que tienen los cuatro roles. Las dos de detalle
 * piden ademas el permiso del modulo del que sacan los datos y se encargan ellas
 * mismas de explicarlo si el rol no llega.
 */
const TABS = [
  { value: 'resumen', label: 'Resumen', printTitle: 'Resumen general' },
  { value: 'ventas', label: 'Ventas', printTitle: 'Reporte de ventas' },
  { value: 'gastos', label: 'Gastos', printTitle: 'Reporte de gastos' },
  { value: 'rentabilidad', label: 'Rentabilidad', printTitle: 'Rentabilidad por unidad' },
  { value: 'cobros', label: 'Cuentas por cobrar', printTitle: 'Cuentas por cobrar' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

function isTab(value: string | null): value is TabValue {
  return TABS.some((tab) => tab.value === value);
}

export function ReportsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const requested = searchParams.get('tab');
  const activeTab: TabValue = isTab(requested) ? requested : 'resumen';
  const tab = TABS.find((item) => item.value === activeTab) ?? TABS[0];

  const firmante = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-6 print:gap-3">
      {/*
        En pantalla manda el `PageHeader`; en papel, el membrete con el logo.
        Son la misma informacion contada en dos lenguajes distintos, y ninguno
        de los dos tiene sentido en el soporte del otro: el impreso no lleva
        boton de imprimir, y la pantalla no necesita el RNC de la empresa.
      */}
      <div className="print:hidden">
        <PageHeader
          eyebrow="Reportes"
          title="Analisis del negocio"
          description="Ventas, gastos, rentabilidad por unidad y cartera pendiente de cobro."
          actions={
            <Button variant="outline" onClick={imprimirPagina}>
              <Printer />
              Imprimir
            </Button>
          }
        />
      </div>

      <PrintLetterhead
        title={tab.printTitle}
        subtitle="Documento interno · sin valor fiscal"
        meta={[
          { label: 'Emitido', value: formatDateTime(new Date().toISOString()) },
          ...(firmante ? [{ label: 'Generado por', value: firmante }] : []),
        ]}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setSearchParams(value === 'resumen' ? {} : { tab: value }, { replace: true })
        }
      >
        <TabsList className="print:hidden">
          {TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/*
          Cada panel se monta solo cuando su pestaña esta activa (`<TabsContent>`
          desmonta el resto), asi que abrir Reportes no dispara siete consultas
          agregadas de golpe.
        */}
        <TabsContent value="resumen">
          <OverviewPanel />
        </TabsContent>
        <TabsContent value="ventas">
          <SalesPanel />
        </TabsContent>
        <TabsContent value="gastos">
          <ExpensesPanel />
        </TabsContent>
        <TabsContent value="rentabilidad">
          <ProfitabilityPanel />
        </TabsContent>
        <TabsContent value="cobros">
          <ReceivablePanel />
        </TabsContent>
      </Tabs>

      <p className="text-xs leading-relaxed text-muted-foreground print:hidden">
        Importes consolidados en pesos con la tasa registrada en cada documento, asi que las
        operaciones en distintas monedas son comparables entre si. Generado para{' '}
        {user?.firstName} {user?.lastName}.
      </p>

      <PrintLetterfoot>
        <p>
          Importes consolidados en pesos con la tasa registrada en cada documento, asi que las
          operaciones en distintas monedas son comparables entre si.
        </p>
        <p className="mt-1">
          {tab.printTitle} · {COMPANY.name}
          {firmante && ` · Generado por ${firmante}`}
        </p>
      </PrintLetterfoot>
    </div>
  );
}
