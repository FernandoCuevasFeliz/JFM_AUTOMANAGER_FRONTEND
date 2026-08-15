import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ExternalLink,
  FilePlus2,
  Printer,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/features/auth/use-auth';
import { useClient } from '@/features/clients/hooks';
import { useSale } from '@/features/sales/hooks';
import { useVehicle } from '@/features/vehicles/hooks';
import { formatCivilDate, formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { FISCAL_DOC_STATUS_META } from '@/lib/status';
import { cn } from '@/lib/utils';
import { imprimirPagina } from '@/lib/use-print-mode';
import { CreditNoteDialog, IssueDialog, RejectDialog } from '../components/fiscal-dialogs';
import { InvoiceDocument } from '../components/invoice-document';
import {
  useCancelInvoice,
  useCreateCreditNote,
  useInvoice,
  useIssueCreditNote,
  useIssueInvoice,
  useRejectCreditNote,
  useRejectInvoice,
  useRetryInvoice,
} from '../hooks';
import { buildInvoiceView } from '../invoice-view';
import {
  NCF_TYPE_LABELS,
  acceptsCreditNotes,
  availableToCredit,
  canCancel,
  canIssue,
  canRetry,
  isCompleteInvoice,
} from '../types';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();

  const invoiceQuery = useInvoice(id);
  const invoice = invoiceQuery.data;

  // Enriquecen el papel; si faltan permisos, el documento sale con menos detalle.
  const saleQuery = useSale(invoice?.saleId);
  const clientQuery = useClient(saleQuery.data?.clientId);
  const vehicleQuery = useVehicle(saleQuery.data?.vehicleId);

  const issueInvoice = useIssueInvoice(id ?? '');
  const rejectInvoice = useRejectInvoice(id ?? '');
  const retryInvoice = useRetryInvoice(id ?? '');
  const cancelInvoice = useCancelInvoice(id ?? '');
  const createNote = useCreateCreditNote(id ?? '');
  const issueNote = useIssueCreditNote(id ?? '');
  const rejectNote = useRejectCreditNote(id ?? '');

  const [issueOpen, setIssueOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteToIssue, setNoteToIssue] = React.useState<string | null>(null);
  const [noteToReject, setNoteToReject] = React.useState<string | null>(null);

  const view = React.useMemo(
    () =>
      invoice
        ? buildInvoiceView(invoice, saleQuery.data, clientQuery.data, vehicleQuery.data)
        : null,
    [invoice, saleQuery.data, clientQuery.data, vehicleQuery.data],
  );

  React.useEffect(() => {
    if (!invoice) return;
    const previous = document.title;
    document.title = `${invoice.ncfNumber ?? invoice.saleNumber} — ${invoice.clientName}`;
    return () => {
      document.title = previous;
    };
  }, [invoice]);

  /*
   * `isCompleteInvoice` cubre el hueco entre crear el comprobante y releerlo:
   * si por lo que sea llega la entidad pelada de `POST /invoices`, se espera en
   * vez de pintar un documento con los importes vacios.
   */
  if (invoiceQuery.isLoading || (invoice && !isCompleteInvoice(invoice))) {
    return <DetailSkeleton />;
  }

  if (invoiceQuery.isError || !invoice || !view) {
    return <ErrorState error={invoiceQuery.error} onRetry={() => void invoiceQuery.refetch()} />;
  }

  const puedeEmitir = can('invoices:issue');
  const puedeEscribir = can('invoices:write');
  const disponible = availableToCredit(invoice);
  const cargando = saleQuery.isLoading || clientQuery.isLoading || vehicleQuery.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <PageHeader
          eyebrow={`e-CF ${invoice.ncfType} · ${NCF_TYPE_LABELS[invoice.ncfType]}`}
          title={invoice.ncfNumber ?? `Borrador de ${invoice.saleNumber}`}
          description={`${invoice.clientName} · ${formatCivilDate(invoice.saleDate)}`}
          backTo="/invoices"
          backLabel="Comprobantes"
          actions={
            <>
              <Button variant="outline" onClick={imprimirPagina} loading={cargando}>
                <Printer />
                Imprimir
              </Button>

              {puedeEmitir && canIssue(invoice) && (
                <Button onClick={() => setIssueOpen(true)}>
                  <CheckCircle2 />
                  Registrar emision
                </Button>
              )}

              {puedeEmitir && canIssue(invoice) && (
                <Button variant="outline" onClick={() => setRejectOpen(true)}>
                  <XCircle />
                  Registrar rechazo
                </Button>
              )}

              {puedeEscribir && canRetry(invoice) && (
                <Button onClick={() => retryInvoice.mutate()} loading={retryInvoice.isPending}>
                  <RotateCcw />
                  Reintentar
                </Button>
              )}

              {puedeEscribir && canCancel(invoice) && (
                <Button variant="outline" onClick={() => setCancelOpen(true)}>
                  <Ban />
                  Anular
                </Button>
              )}

              {can('credit-notes:write') && acceptsCreditNotes(invoice) && disponible > 0 && (
                <Button variant="outline" onClick={() => setNoteOpen(true)}>
                  <FilePlus2 />
                  Nota de credito
                </Button>
              )}
            </>
          }
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge meta={FISCAL_DOC_STATUS_META[invoice.status]} />
          <Link
            to={`/sales/${invoice.saleId}`}
            className="num text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {invoice.saleNumber}
          </Link>
          {invoice.issuedAt && (
            <span className="text-sm text-muted-foreground">
              Emitida el {formatDate(invoice.issuedAt)}
            </span>
          )}
        </div>

        {invoice.status === 'rejected' && invoice.rejectionReason && (
          <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger/8 px-3.5 py-3 text-[13px] leading-relaxed">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
            <span>
              <strong className="font-semibold">Rechazada por la DGII:</strong>{' '}
              {invoice.rejectionReason}
              <br />
              Corrige lo indicado y pulsa «Reintentar» para devolverla a pendiente.
            </span>
          </p>
        )}

        {invoice.status === 'issued' && (
          <p className="mt-4 rounded-lg border border-border bg-muted/50 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
            Comprobante emitido e inmutable. Para corregirlo o anularlo hay que emitir notas de
            credito; cuando cubran el importe completo, la factura pasa a anulada y solo entonces la
            venta se podra cancelar.
          </p>
        )}

        {/* --- Notas de credito --- */}
        {(invoice.creditNotes.length > 0 || acceptsCreditNotes(invoice)) && (
          <Card className="mt-6">
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>Notas de credito</CardTitle>
              <span className="text-xs text-muted-foreground">
                Acreditado {formatMoney(invoice.creditedAmount, invoice.currencyCode)} de{' '}
                {formatMoney(invoice.salePrice, invoice.currencyCode)} · disponible{' '}
                {formatMoney(disponible, invoice.currencyCode)}
              </span>
            </CardHeader>

            <CardContent className="px-0">
              {invoice.creditNotes.length === 0 ? (
                <p className="px-5 pb-1 text-[13px] text-muted-foreground">
                  Sin notas de credito.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>NCF</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.creditNotes.map((note) => (
                      <TableRow key={note.id}>
                        <TableCell className="num">{note.ncfNumber ?? '—'}</TableCell>
                        <TableCell className="max-w-xs">
                          <span className="line-clamp-2 text-[13px]">{note.reason}</span>
                        </TableCell>
                        <TableCell className="num text-right">
                          {formatMoney(note.amount, invoice.currencyCode)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge meta={FISCAL_DOC_STATUS_META[note.status]} />
                        </TableCell>
                        <TableCell className="text-right">
                          {puedeEmitir && note.status === 'pending' && (
                            <span className="flex justify-end gap-1.5">
                              <Button size="sm" onClick={() => setNoteToIssue(note.id)}>
                                Emitir
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setNoteToReject(note.id)}
                              >
                                Rechazar
                              </Button>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {invoice.xmlUrl && (
          <a
            href={invoice.xmlUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Ver XML firmado
          </a>
        )}
      </div>

      {/* --- Vista previa del impreso --- */}
      <div
        className={cn(
          'overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 shadow-card sm:p-8',
          'print:overflow-visible print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none',
        )}
      >
        <div className="mx-auto w-fit shadow-pop print:w-full print:shadow-none">
          <InvoiceDocument invoice={view} />
        </div>
      </div>

      {/* --- Dialogos --- */}
      <IssueDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        title="Registrar emision del comprobante"
        description="La DGII acepto el envio. Anota el NCF que devolvio."
        expectedPrefix={invoice.ncfType}
        loading={issueInvoice.isPending}
        onSubmit={(values) => issueInvoice.mutateAsync(values)}
      />

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Registrar rechazo de la DGII"
        loading={rejectInvoice.isPending}
        onSubmit={(values) => rejectInvoice.mutateAsync(values)}
      />

      <CreditNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        currencyCode={invoice.currencyCode}
        available={disponible}
        loading={createNote.isPending}
        onSubmit={(values) => createNote.mutateAsync(values)}
      />

      <IssueDialog
        open={noteToIssue !== null}
        onOpenChange={(open) => !open && setNoteToIssue(null)}
        title="Emitir nota de credito"
        description="Una nota de credito siempre es un e-CF de tipo E34."
        expectedPrefix="E34"
        loading={issueNote.isPending}
        onSubmit={(values) =>
          issueNote.mutateAsync({ ...values, creditNoteId: noteToIssue as string })
        }
      />

      <RejectDialog
        open={noteToReject !== null}
        onOpenChange={(open) => !open && setNoteToReject(null)}
        title="Registrar rechazo de la nota"
        loading={rejectNote.isPending}
        onSubmit={(values) =>
          rejectNote.mutateAsync({ ...values, creditNoteId: noteToReject as string })
        }
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Anular el comprobante"
        description="Se descarta este comprobante, que todavia no fue aceptado por la DGII. La accion es irreversible y la venta quedara de nuevo sin facturar."
        confirmLabel="Anular"
        destructive
        loading={cancelInvoice.isPending}
        onConfirm={() => {
          cancelInvoice.mutate();
          setCancelOpen(false);
        }}
      />
    </div>
  );
}
