import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
} from '@imagekit/react';
import { ImageOff, Link2, Star, Trash2, Upload } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IMAGEKIT_AUTH_ENDPOINT,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_UPLOAD_ENABLED,
} from '@/lib/env';
import { cn } from '@/lib/utils';
import {
  useAddVehicleImage,
  useDeleteVehicleImage,
  useSetPrimaryImage,
  useVehicleImages,
} from '../hooks';

/**
 * Galeria e ingreso de imagenes de un vehiculo.
 *
 * El backend **no recibe archivos**: solo guarda la URL (§5.4 de API.md). El
 * archivo se sube desde el navegador a ImageKit y aqui se registra la URL que
 * devuelve.
 *
 * La subida directa exige `signature`, `token` y `expire` firmados con la clave
 * privada de ImageKit, es decir, un endpoint de autenticacion propio. Si no hay
 * ninguno configurado (`VITE_IMAGEKIT_AUTH_ENDPOINT`), el componente cae al
 * modo "pegar URL", que cubre el mismo caso de uso sin inventar endpoints.
 */

interface AuthParams {
  signature: string;
  expire: number;
  token: string;
  publicKey?: string;
}

async function fetchUploadAuth(): Promise<AuthParams> {
  const response = await fetch(IMAGEKIT_AUTH_ENDPOINT);
  if (!response.ok) {
    throw new Error(`El servicio de firma respondio ${response.status}`);
  }
  return (await response.json()) as AuthParams;
}

export function VehicleImagesUploader({
  vehicleId,
  canEdit,
}: {
  vehicleId: string;
  canEdit: boolean;
}) {
  const imagesQuery = useVehicleImages(vehicleId);
  const addImage = useAddVehicleImage(vehicleId);
  const setPrimary = useSetPrimaryImage(vehicleId);
  const deleteImage = useDeleteVehicleImage(vehicleId);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [manualUrl, setManualUrl] = React.useState('');
  const [showUrlInput, setShowUrlInput] = React.useState(!IMAGEKIT_UPLOAD_ENABLED);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  const images = imagesQuery.data ?? [];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        setProgress(0);
        const auth = await fetchUploadAuth();

        const result = await upload({
          file,
          fileName: file.name,
          publicKey: auth.publicKey ?? IMAGEKIT_PUBLIC_KEY,
          signature: auth.signature,
          expire: auth.expire,
          token: auth.token,
          folder: '/vehiculos',
          useUniqueFileName: true,
          onProgress: (event) => {
            if (event.lengthComputable) {
              setProgress(Math.round((event.loaded / event.total) * 100));
            }
          },
        });

        if (!result.url) {
          throw new Error('ImageKit no devolvio una URL');
        }

        // La primera imagen queda como principal aunque se mande `false`.
        await addImage.mutateAsync({ url: result.url, isPrimary: false });
      } catch (error) {
        toast.error('No se pudo subir la imagen', { description: describeUploadError(error) });
      } finally {
        setProgress(null);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleAddUrl(event: React.FormEvent) {
    event.preventDefault();
    const url = manualUrl.trim();
    if (!url) return;

    addImage.mutate(
      { url, isPrimary: false },
      { onSuccess: () => setManualUrl('') },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {IMAGEKIT_UPLOAD_ENABLED && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => void handleFiles(event.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={progress !== null}
                >
                  <Upload />
                  {progress !== null ? `Subiendo… ${progress}%` : 'Subir imagenes'}
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlInput((value) => !value)}
            >
              <Link2 />
              {showUrlInput ? 'Ocultar URL' : 'Agregar por URL'}
            </Button>
          </div>

          {progress !== null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {showUrlInput && (
            <form onSubmit={handleAddUrl} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  value={manualUrl}
                  onChange={(event) => setManualUrl(event.target.value)}
                  placeholder="https://ik.imagekit.io/…/frente.jpg"
                  type="url"
                />
                <Button type="submit" loading={addImage.isPending} disabled={!manualUrl.trim()}>
                  Agregar
                </Button>
              </div>
              {!IMAGEKIT_UPLOAD_ENABLED && (
                <p className="text-xs text-muted-foreground">
                  La subida directa a ImageKit esta desactivada: falta configurar{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                    VITE_IMAGEKIT_AUTH_ENDPOINT
                  </code>
                  . Mientras tanto puedes registrar la URL de una imagen ya alojada.
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {imagesQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="aspect-4/3 w-full rounded-lg" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title="Sin imagenes"
          description={
            canEdit
              ? 'Agrega fotos de la unidad para mostrarlas en cotizaciones y fichas.'
              : 'Este vehiculo todavia no tiene fotos registradas.'
          }
          className="rounded-lg border border-dashed border-border py-10"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <figure
              key={image.id}
              className={cn(
                'group relative overflow-hidden rounded-lg border bg-muted',
                image.isPrimary ? 'border-primary ring-1 ring-primary' : 'border-border',
              )}
            >
              <img
                src={image.url}
                alt="Fotografia del vehiculo"
                loading="lazy"
                className="aspect-4/3 w-full object-cover"
              />

              {image.isPrimary && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                  <Star className="size-3 fill-current" />
                  Portada
                </span>
              )}

              {canEdit && (
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-linear-to-t from-slate-950/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  {!image.isPrimary && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="secondary"
                      onClick={() => setPrimary.mutate(image.id)}
                      disabled={setPrimary.isPending}
                      aria-label="Marcar como portada"
                    >
                      <Star />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    onClick={() => setPendingDelete(image.id)}
                    aria-label="Eliminar imagen"
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </figure>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Eliminar imagen"
        description="La imagen dejara de mostrarse en la ficha del vehiculo. Si era la portada, otra ocupara su lugar automaticamente."
        confirmLabel="Eliminar"
        destructive
        loading={deleteImage.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteImage.mutate(pendingDelete, { onSettled: () => setPendingDelete(null) });
        }}
      />
    </div>
  );
}

function describeUploadError(error: unknown): string {
  if (error instanceof ImageKitAbortError) return 'La subida se cancelo.';
  if (error instanceof ImageKitInvalidRequestError) return `Peticion invalida: ${error.message}`;
  if (error instanceof ImageKitUploadNetworkError) return 'Fallo de red durante la subida.';
  if (error instanceof ImageKitServerError) return 'ImageKit devolvio un error del servidor.';
  if (error instanceof Error) return error.message;
  return 'Error desconocido.';
}
