import { Printer } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/use-auth';
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
  { value: 'resumen', label: 'Resumen' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'gastos', label: 'Gastos' },
  { value: 'rentabilidad', label: 'Rentabilidad' },
  { value: 'cobros', label: 'Cuentas por cobrar' },
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Reportes"
        title="Analisis del negocio"
        description="Ventas, gastos, rentabilidad por unidad y cartera pendiente de cobro."
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            Imprimir
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setSearchParams(value === 'resumen' ? {} : { tab: value }, { replace: true })
        }
      >
        <TabsList className="print:hidden">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
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

      <p className="text-xs leading-relaxed text-muted-foreground">
        Importes consolidados en pesos con la tasa registrada en cada documento, asi que las
        operaciones en distintas monedas son comparables entre si. Generado para{' '}
        {user?.firstName} {user?.lastName}.
      </p>
    </div>
  );
}
