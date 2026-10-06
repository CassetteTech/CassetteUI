'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { EASE_OUT_QUART } from '@/lib/motion';
import { STREAMING_SERVICES } from './home-brand';

// Placeholder posts; the ones marked true are kept for members.
const rows = [false, true, false, true];

const bar = 'block rounded-full bg-muted';

/**
 * A curator page as a template, with no example curator or music: the
 * membership card with the curator's price and Join, and posts kept for
 * members behind a lock. A join notice lands every few seconds, so the
 * money in "get paid for your playlists" is visible. Reduced motion hides
 * the notice in CSS, so a change mid-session applies at once.
 */
export function CuratorPhoneDemo() {
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let hide: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      setJoined(true);
      hide = setTimeout(() => setJoined(false), 2600);
    };
    const first = setTimeout(show, 1800);
    const timer = setInterval(show, 6500);
    return () => {
      clearTimeout(first);
      clearTimeout(hide);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="relative mx-auto w-72 sm:w-80">
      <div className="relative h-[580px] rounded-[2.5rem] bg-black p-2 sm:h-[620px]">
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-background text-foreground">
          <div className="flex h-full flex-col pt-8">
            <div className="space-y-3 px-4">
              <div className="flex items-center gap-3">
                <span className="h-12 w-12 shrink-0 rounded-full bg-muted" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">Your name</p>
                  <p className="font-mono text-xs text-muted-foreground">@yourhandle</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <span className={`${bar} h-2 w-11/12`} />
                <span className={`${bar} h-2 w-2/3`} />
              </div>
              <div className="flex gap-1.5">
                {STREAMING_SERVICES.map((service) => (
                  <Image key={service.label} src={service.logo} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                ))}
              </div>
            </div>

            <div className="mx-3 mt-3 rounded-xl border border-primary/30 bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">Membership</p>
                  <span className={`${bar} mt-1.5 h-2 w-4/5`} />
                </div>
                <p className="shrink-0 text-xs font-semibold">
                  Your price<span className="text-muted-foreground">/mo</span>
                </p>
              </div>
              {/* A picture of the control, not a control: the phone is an illustration. */}
              <span className="mt-2.5 block rounded-md bg-primary py-1.5 text-center text-xs font-bold text-primary-foreground">
                Join
              </span>
            </div>

            <div className="mt-3 flex gap-4 border-b border-border/60 px-4 text-[11px] font-semibold">
              <span className="border-b-2 border-primary pb-1.5">Playlists</span>
              <span className="pb-1.5 text-muted-foreground">Tracks</span>
              <span className="pb-1.5 text-muted-foreground">Albums</span>
            </div>

            <ul className="flex-1 space-y-2 overflow-hidden px-3 py-3">
              {rows.map((locked, index) => (
                <li key={index} className="flex items-center gap-2.5 rounded-lg p-1.5">
                  <span className="h-10 w-10 shrink-0 rounded-md bg-muted" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <span className={`${bar} h-2 w-3/4`} />
                    <span className={`${bar} h-2 w-1/3`} />
                  </div>
                  {locked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      <Lock className="h-2.5 w-2.5" aria-hidden />
                      Members
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Simulated activity: shown, never announced. */}
          <div aria-hidden className="motion-reduce:hidden">
            <AnimatePresence>
              {joined && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.4, ease: EASE_OUT_QUART }}
                  className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 elev-soft"
                >
                  <span className="signal-dot text-success-text" />
                  <p className="text-xs">A fan joined your membership</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
