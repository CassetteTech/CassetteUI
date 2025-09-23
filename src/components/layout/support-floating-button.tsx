'use client';

import Image from 'next/image';
import { openKoFiSupport, KOFI_ICON_SRC } from '@/lib/ko-fi';

export function SupportFloatingButton() {
  return (
    <button
      type="button"
      onClick={openKoFiSupport}
      className="fixed bottom-5 left-4 z-[60] flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label="Support Cassette on Ko-fi"
    >
      <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={18} height={18} />
      <span>Support Us</span>
    </button>
  );
}
