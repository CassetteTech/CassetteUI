'use client';

/** Single-file drop zone: drag and drop, click, or keyboard to open the picker.
    Layout after opensourceui.in's file-upload-field-input (MIT), trimmed to one
    file with a caller-supplied preview. Validation stays with the caller. */

import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FileDropField({
  preview,
  dropLabel = 'Drop your image here',
  browseLabel = 'Choose file',
  hint,
  error,
  onFile,
  className,
  inputProps,
  browseTestId,
}: {
  /** Current file rendered inside the zone (an avatar, a thumbnail). */
  preview?: ReactNode;
  dropLabel?: string;
  browseLabel?: string;
  hint?: ReactNode;
  error?: ReactNode;
  onFile: (file: File | null) => void;
  className?: string;
  /** Spread onto the hidden input (accept, name, data-testid). */
  inputProps?: Omit<ComponentProps<'input'>, 'type' | 'onChange' | 'ref'> & { 'data-testid'?: string };
  browseTestId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* A label wraps the input, so clicks need no role or key handlers; drop is a pointer-only extra. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onFile(event.dataTransfer.files[0] ?? null);
        }}
        className={cn(
          'flex cursor-pointer items-center gap-4 rounded-lg border border-dashed p-4 transition-colors focus-within:ring-2 focus-within:ring-ring',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
          error && 'border-destructive',
        )}
      >
        {preview ?? (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ImagePlus aria-hidden className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{dropLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Drag and drop, or click anywhere</p>
        </div>
        <span
          data-testid={browseTestId}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          {browseLabel}
        </span>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onClick={(event) => { event.currentTarget.value = ''; }}
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
          {...inputProps}
        />
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
