import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { VehicleImage } from '../types';

interface VehicleImageViewerProps {
  images: VehicleImage[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

export function VehicleImageViewer({ images, index, onIndexChange }: VehicleImageViewerProps) {
  const open = index !== null && images.length > 0;
  const activeIndex = index === null ? 0 : Math.min(index, images.length - 1);
  const activeImage = images[activeIndex];
  const hasMultiple = images.length > 1;

  const showPrevious = React.useCallback(() => {
    onIndexChange((activeIndex - 1 + images.length) % images.length);
  }, [activeIndex, images.length, onIndexChange]);

  const showNext = React.useCallback(() => {
    onIndexChange((activeIndex + 1) % images.length);
  }, [activeIndex, images.length, onIndexChange]);

  React.useEffect(() => {
    if (!open || !hasMultiple) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPrevious();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasMultiple, open, showNext, showPrevious]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onIndexChange(null)}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-6xl gap-0 overflow-hidden border-slate-700 bg-slate-950 p-0 text-white shadow-2xl sm:w-[calc(100%-2rem)]">
        <DialogTitle className="sr-only">Galeria de imagenes del vehiculo</DialogTitle>
        <DialogDescription className="sr-only">
          Imagen {activeIndex + 1} de {images.length}.
        </DialogDescription>

        {activeImage && (
          <>
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/35 px-2 py-12 sm:px-16">
              <img
                key={activeImage.id}
                src={activeImage.url}
                alt={`Fotografia ${activeIndex + 1} del vehiculo`}
                className="max-h-[calc(100dvh-12rem)] w-auto max-w-full object-contain"
              />

              {hasMultiple && (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 shadow-lg sm:left-4"
                    onClick={showPrevious}
                    aria-label="Ver imagen anterior"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 shadow-lg sm:right-4"
                    onClick={showNext}
                    aria-label="Ver imagen siguiente"
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}

              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-2.5 py-1 text-xs font-medium tabular-nums text-white">
                {activeIndex + 1} / {images.length}
              </span>
            </div>

            {hasMultiple && (
              <div className="flex max-w-full gap-2 overflow-x-auto border-t border-slate-800 bg-slate-950 p-3">
                {images.map((image, imageIndex) => (
                  <button
                    key={image.id}
                    type="button"
                    className={cn(
                      'relative size-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors sm:size-16',
                      imageIndex === activeIndex
                        ? 'border-white'
                        : 'border-transparent opacity-65 hover:opacity-100',
                    )}
                    onClick={() => onIndexChange(imageIndex)}
                    aria-label={`Ver imagen ${imageIndex + 1}`}
                    aria-current={imageIndex === activeIndex ? 'true' : undefined}
                  >
                    <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
