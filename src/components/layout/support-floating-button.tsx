'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { openKoFiSupport, KOFI_ICON_SRC } from '@/lib/ko-fi';

export function SupportFloatingButton() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      setIsVisible(scrollPercent < 0.5);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={openKoFiSupport}
      className={`fixed bottom-5 left-4 z-[60] flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      aria-label="Support Cassette on Ko-fi"
    >
      <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={18} height={18} />
      <span>Support Us</span>
    </button>
  );
}
