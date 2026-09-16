'use client';

/** Single-image drop zone: drag and drop, click, or keyboard to open the picker.
    Layout after opensourceui.in's file-upload-field-input (MIT), trimmed to one
    image on the theme tokens: a framed zone with a faint grid and corner marks
    that shows the current image when there is one, a browse button, and the
    accepted formats as chips. Validation stays with the caller. */

import { useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const gridCells = Array.from({ length: 9 }, (_, index) => index);
const corners = [
  'left-3 top-3 border-l-2 border-t-2',
  'right-3 top-3 border-r-2 border-t-2',
  'bottom-3 left-3 border-b-2 border-l-2',
  'bottom-3 right-3 border-b-2 border-r-2',
];

export function FileDropField({
  previewUrl,
  previewAlt = '',
  dropLabel = 'Drop your image here',
  browseLabel = 'Choose file',
  replaceLabel = 'Replace image',
  hint,
  error,
  onFile,
  className,
  inputProps,
  browseTestId,
}: {
  /** Current image, shown inside the zone; the zone stays a drop target. */
  previewUrl?: string | null;
  previewAlt?: string;
  dropLabel?: string;
  browseLabel?: string;
  replaceLabel?: string;
  hint?: ReactNode;
  error?: ReactNode;
  onFile: (file: File | null) => void;
  className?: string;
  /** Spread onto the hidden input (accept, name, data-testid). */
  inputProps?: Omit<ComponentProps<'input'>, 'type' | 'onChange' | 'ref'> & { 'data-testid'?: string };
  browseTestId?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const accepted = (inputProps?.accept ?? '')
    .split(',')
    .map((token) => token.trim().replace(/^image\//, '').replace(/^\./, '').toUpperCase())
    .filter(Boolean);
  const hasPreview = Boolean(previewUrl);
  const openPicker = () => inputRef.current?.click();

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'card-ink grid gap-4 overflow-hidden p-4 transition-colors sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-start sm:p-5',
          error && 'border-destructive/60',
        )}
      >
        {/* The zone: a button, so Enter and Space open the picker; drop is a pointer-only extra.
            Square, because it previews an avatar. */}
        <button
          type="button"
          aria-label={hasPreview ? replaceLabel : dropLabel}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onClick={openPicker}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            // SAFETY: relatedTarget on a drag event is the element the pointer moved to, or null.
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            onFile(event.dataTransfer.files[0] ?? null);
          }}
          className={cn(
            'group relative block aspect-square w-full max-w-[14rem] overflow-hidden rounded-lg border text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            dragging ? 'border-primary bg-primary/5' : 'border-border/70 bg-muted/30 hover:border-foreground/40',
          )}
        >
          {hasPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URLs from the crop dialog are not optimizable
            <img src={previewUrl ?? undefined} alt={previewAlt} className="size-full object-cover" />
          ) : (
            <div aria-hidden className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {gridCells.map((cell) => <div key={cell} className="border border-border/40" />)}
            </div>
          )}
          {corners.map((corner) => (
            <span
              key={corner}
              aria-hidden
              className={cn(
                'absolute size-5 transition-colors group-hover:border-foreground/70',
                hasPreview ? 'border-background/90' : 'border-border',
                corner,
              )}
            />
          ))}
          <div
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center px-6 text-center transition-opacity',
              hasPreview && 'bg-background/70 opacity-0 backdrop-blur-sm group-hover:opacity-100 group-focus-visible:opacity-100',
              dragging && 'opacity-100',
            )}
          >
            <span
              className={cn(
                'mb-3 flex size-12 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-[transform,color,border-color]',
                dragging ? 'scale-105 border-primary text-primary' : 'group-hover:text-foreground',
              )}
            >
              <ImagePlus aria-hidden className="size-5" />
            </span>
            <span className="text-sm font-semibold">{dragging ? 'Release to upload' : hasPreview ? replaceLabel : dropLabel}</span>
            <span className="mt-1 text-xs text-muted-foreground">Drag and drop, or click</span>
          </div>
        </button>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{hasPreview ? 'Current photo' : 'No file selected'}</p>
            {hint && <p id={`${id}-hint`} className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <button
            type="button"
            data-testid={browseTestId}
            onClick={openPicker}
            className="inline-flex h-9 w-fit shrink-0 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {hasPreview ? replaceLabel : browseLabel}
          </button>
          {accepted.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Accepted formats">
              {accepted.map((token) => (
                <li key={token} className="rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {token}
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          onClick={(event) => { event.currentTarget.value = ''; }}
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
          {...inputProps}
        />
      </div>
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
