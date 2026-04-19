'use client';

import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import Cropper, { type Area } from 'react-easy-crop';
import { Loader2, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cropAvatarFile } from '@/lib/utils/avatar-crop';

interface AvatarCropDialogProps {
  open: boolean;
  file: File | null;
  onApply: (file: File) => Promise<void> | void;
  onCancel: () => void;
}

export function AvatarCropDialog({
  open,
  file,
  onApply,
  onCancel,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }

    const nextImageUrl = URL.createObjectURL(file);
    setImageUrl(nextImageUrl);

    return () => {
      URL.revokeObjectURL(nextImageUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsApplying(false);
  }, [file, open]);

  if (!file || !imageUrl) {
    return null;
  }

  const handleApply = async () => {
    if (!croppedAreaPixels) {
      return;
    }

    setIsApplying(true);

    try {
      const croppedFile = await cropAvatarFile(file, croppedAreaPixels);
      await onApply(croppedFile);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isApplying) {
          onCancel();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]',
          )}
        >
          <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
            Adjust profile photo
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            Drag to reposition and use zoom to frame the part of the photo you want to keep.
          </DialogPrimitive.Description>

          <button
            type="button"
            onClick={onCancel}
            disabled={isApplying}
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          <div className="mt-4 space-y-4">
            <div className="relative h-72 overflow-hidden rounded-xl bg-black sm:h-80">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                minZoom={1}
                maxZoom={3}
                objectFit="cover"
                onCropChange={setCrop}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                onZoomChange={setZoom}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="avatar-crop-zoom" className="font-medium text-foreground">
                  Zoom
                </label>
                <span className="text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </div>
              <input
                id="avatar-crop-zoom"
                data-testid="avatar-crop-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isApplying}
                className="flex-1"
                data-testid="avatar-crop-cancel"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApply}
                disabled={isApplying || !croppedAreaPixels}
                className="flex-1"
                data-testid="avatar-crop-apply"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying…
                  </>
                ) : (
                  'Apply'
                )}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
