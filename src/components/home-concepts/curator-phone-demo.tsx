'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Lock, Share2 } from 'lucide-react';
import { EASE_OUT_QUART } from '@/lib/motion';

// Portrait and covers were generated for this demo (scripts/higgsfield-home-concepts.json).
const curator = {
  name: 'Nadia Reyes',
  handle: 'nadiareyes',
  avatar: '/images/home-concepts/curator-portrait.jpg',
  bio: 'Late-night R&B and the B-sides nobody plays.',
  // The current default and minimum monthly price a curator can set.
  price: 5,
};

const playlists = [
  { title: 'After Dark, Vol. 7', tracks: 24, image: '/images/home-concepts/cover-after-dark.jpg', locked: true },
  { title: 'Sunday Slow Burn', tracks: 31, image: '/images/home-concepts/cover-slow-burn.jpg', locked: false },
  { title: 'Deep Cuts, March', tracks: 18, image: '/images/home-concepts/cover-deep-cuts.jpg', locked: true },
  { title: 'Windows Down', tracks: 40, image: '/images/home-concepts/cover-windows-down.jpg', locked: false },
];

const joins = ['Sam', 'Priya', 'Leo', 'Kofi'];

/**
 * An example curator's public page as a fan sees it: the membership card
 * with a price the curator set, and playlists kept for members behind a
 * lock. A join notice lands every few seconds, so the money in "get paid
 * for your playlists" is visible without a chart.
 */
export function CuratorPhoneDemo() {
  const still = useReducedMotion();
  const [join, setJoin] = useState<number | null>(null);

  useEffect(() => {
    if (still) return;
    let count = 0;
    const show = () => {
      setJoin(count % joins.length);
      count += 1;
      setTimeout(() => setJoin(null), 2600);
    };
    const first = setTimeout(show, 1800);
    const timer = setInterval(show, 6500);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [still]);

  return (
    <div className="relative mx-auto w-72 sm:w-80">
      <div className="relative h-[580px] rounded-[2.5rem] bg-black p-2 sm:h-[620px]">
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-background text-foreground">
          <div className="flex h-full flex-col pt-8">
            <div className="space-y-3 px-4">
              <div className="flex items-center gap-3">
                <Image src={curator.avatar} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{curator.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">@{curator.handle}</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed">{curator.bio}</p>
              <div className="flex gap-1.5">
                {['spotify', 'apple_music', 'deezer'].map((service) => (
                  <Image key={service} src={`/images/${service}_logo_colored.png`} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                ))}
              </div>
            </div>

            {/* Membership card: the price is the curator's. */}
            <div className="mx-3 mt-3 rounded-xl border border-primary/30 bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold">Members get the vault</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    The playlists I only share with members.
                  </p>
                </div>
                <p className="shrink-0 font-teko text-2xl font-bold leading-none tabular-nums">
                  ${curator.price}<span className="text-xs font-semibold text-muted-foreground">/mo</span>
                </p>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                {/* Pictures of the controls, not controls: the phone is an illustration. */}
                <span className="flex-1 rounded-md bg-primary py-1.5 text-center text-xs font-bold text-primary-foreground">
                  Join Nadia
                </span>
                <span aria-hidden className="rounded-md border border-border p-1.5">
                  <Share2 className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            <div className="mt-3 flex gap-4 border-b border-border/60 px-4 text-[11px] font-semibold">
              <span className="border-b-2 border-primary pb-1.5">Playlists</span>
              <span className="pb-1.5 text-muted-foreground">Tracks</span>
              <span className="pb-1.5 text-muted-foreground">Albums</span>
            </div>

            <ul className="flex-1 space-y-2 overflow-hidden px-3 py-3">
              {playlists.map((playlist) => (
                <li key={playlist.title} className="flex items-center gap-2.5 rounded-lg p-1.5">
                  <Image src={playlist.image} alt="" width={40} height={40} className="h-10 w-10 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{playlist.title}</p>
                    <p className="text-[11px] text-muted-foreground">{playlist.tracks} tracks</p>
                  </div>
                  {playlist.locked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      <Lock className="h-2.5 w-2.5" aria-hidden />
                      Members
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <AnimatePresence>
            {join !== null && (
              <motion.div
                key={join}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.4, ease: EASE_OUT_QUART }}
                className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 elev-soft"
                // Simulated activity: shown, never announced.
                aria-hidden
              >
                <span className="signal-dot text-success-text" aria-hidden />
                <p className="text-xs">
                  <span className="font-semibold">{joins[join]}</span> joined for ${curator.price}/mo
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
