'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { AnimatedButton } from '@/components/ui/animated-button';
import { UIText } from '@/components/ui/typography';
import Image from 'next/image';

interface AppleMusicHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppleMusicHelpModal({
  open,
  onOpenChange
}: AppleMusicHelpModalProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold text-foreground">
            Shareable Link Needed
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            It looks like you&apos;ve pasted a link from your personal Apple Music library.
            These links are private and can&apos;t be shared. Please use the &apos;Share&apos; option to get a public link.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4">
          <div className="bg-muted rounded-lg p-4">
            <div className="flex flex-col items-center">

              <div className="lg:hidden flex flex-col items-center">
                <div className="max-w-[280px] aspect-[1290/2796] rounded-lg overflow-hidden">
                  <Image
                    src="/gifs/apple-music-share-mobile.gif"
                    alt="How to share Apple Music link on mobile"
                    width={1290}
                    height={2796}
                    className="rounded-lg w-full h-full object-contain bg-black"
                    unoptimized
                    priority
                  />
                </div>
              </div>

              <div className="hidden lg:flex flex-col items-center">
                <div className="w-full max-w-6xl rounded-lg overflow-hidden min-h-[500px] lg:min-h-[600px] xl:min-h-[700px]">
                  <Image
                    src="/gifs/apple-music-share-desktop.gif"
                    alt="How to share Apple Music link on desktop"
                    width={2560}
                    height={1440}
                    className="rounded-lg w-full h-full object-contain"
                    unoptimized
                    priority
                    style={{
                      imageRendering: 'auto',
                      maxWidth: '100%'
                    }}
                  />
                </div>
              </div>

            </div>
          </div>

          <div className="space-y-4">
            <UIText className="font-semibold text-foreground">
              How to get a shareable link:
            </UIText>

            <div className="hidden lg:block space-y-2">
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Find the playlist in Apple Music</li>
                <li>Click the <strong>...</strong> (More) button</li>
                <li>Select <strong>Share</strong></li>
                <li>Click <strong>Copy</strong> at the bottom of the menu</li>
              </ol>
            </div>

            <div className="lg:hidden space-y-2">
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Open the playlist in Apple Music</li>
                <li>Tap the <strong>Share</strong> button (arrow pointing up)</li>
                <li>Select <strong>Copy Link</strong> from the share menu</li>
              </ol>
            </div>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <UIText className="text-sm text-muted-foreground">
              <strong>Note:</strong> Make sure the playlist is set to &ldquo;Public&rdquo; in your Apple Music library.
              Private playlists cannot be shared even with the share link.
            </UIText>
          </div>
        </div>

        <SheetFooter>
          <AnimatedButton
            text="Got It!"
            onClick={() => onOpenChange(false)}
            height={40}
            width={120}
            initialPos={4}
            colorTop='hsl(var(--primary))'
            colorBottom='hsl(var(--destructive))'
            borderColorTop='hsl(var(--primary))'
            borderColorBottom='hsl(var(--destructive))'
            textStyle="text-sm font-semibold text-white"
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}