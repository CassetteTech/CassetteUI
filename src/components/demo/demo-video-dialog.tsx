'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type DemoVideoDialogProps = {
  trigger: ReactNode;
  title: string;
  videoSrc: string;
  videoType?: string;
  posterSrc?: string;
  caption?: string;
};

export function DemoVideoDialog({
  trigger,
  title,
  videoSrc,
  videoType = 'video/mp4',
  posterSrc,
  caption,
}: DemoVideoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-5xl overflow-hidden border-foreground bg-black p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          {caption ? <DialogDescription>{caption}</DialogDescription> : null}
        </DialogHeader>
        <video
          className="block h-auto max-h-[80vh] w-full"
          controls
          preload="metadata"
          poster={posterSrc}
        >
          <source src={videoSrc} type={videoType} />
          Your browser does not support HTML5 video.
        </video>
      </DialogContent>
    </Dialog>
  );
}
