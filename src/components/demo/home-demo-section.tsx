'use client';

import { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Link2,
  Music2,
  Share2,
  Sparkles,
} from 'lucide-react';
import { ProfileDemo } from '@/components/demo/profile-demo';
import { AnimatedButton } from '@/components/ui/animated-button';

interface HomeDemoSectionProps {
  isAuthenticated: boolean;
}

/* ─── Shared easing ────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as const;

/* ─── Reusable variants ────────────────────────────────── */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease } },
};

/* ─── Step data ────────────────────────────────────────── */
const steps = [
  {
    number: '01',
    icon: Link2,
    title: 'Paste any link',
    description: 'Drop a Spotify, Apple Music, or Deezer link — track, album, playlist, or artist.',
    gradient: 'from-emerald-400 to-emerald-600',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'One universal link',
    description: 'Cassette matches it across every major streaming platform instantly.',
    gradient: 'from-primary to-secondary',
  },
  {
    number: '03',
    icon: Share2,
    title: 'Share with anyone',
    description: 'Your link opens in each listener\'s preferred app. No friction.',
    gradient: 'from-violet-400 to-indigo-500',
  },
];

/* ─── Demo link data ───────────────────────────────────── */
const demoLinks = [
  {
    title: 'Stronger',
    artist: 'Kanye West',
    href: '/post?url=https://open.spotify.com/track/4fzsfWzRhPawzqhX8Qt9F3',
    accent: 'from-emerald-400 to-emerald-600',
    platform: 'Spotify',
  },
  {
    title: 'Time',
    artist: 'Pink Floyd',
    href: '/post?url=https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699?i=1065973705',
    accent: 'from-pink-400 to-rose-600',
    platform: 'Apple Music',
  },
  {
    title: 'Midnight City',
    artist: 'M83',
    href: '/post?url=https://open.spotify.com/track/3jtvJtAA25a7d0BLOJ8Dqo',
    accent: 'from-violet-400 to-indigo-600',
    platform: 'Spotify',
  },
];

/* ─── Animated connecting line (draws itself) ──────────── */
function DrawLine() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  return (
    <div ref={ref} className="hidden sm:block absolute top-10 left-[calc(16.67%+48px)] right-[calc(16.67%+48px)] h-0.5 overflow-hidden">
      <motion.div
        className="h-full border-t-2 border-dashed border-foreground/20"
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease }}
        style={{ originX: 0 }}
      />
    </div>
  );
}

/* ─── Step number tile — zine-style stamped card ──────── */
function StepTile({
  icon: Icon,
  number,
  index,
}: {
  icon: typeof Link2;
  number: string;
  index: number;
}) {
  const rot = (index - 1) * 1.5;
  return (
    <motion.div
      className="relative z-10 mb-5"
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, delay: index * 0.1, ease },
        },
      }}
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <div className="relative w-20 h-20 bg-primary-foreground force-light-surface text-foreground border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_hsl(var(--cassette-white))]">
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-7 w-7 text-foreground" strokeWidth={2} />
        </div>
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground border border-foreground font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 leading-none"
        >
          {number}
        </span>
      </div>
    </motion.div>
  );
}

/* ═════════════════════════════════════════════════════════
   Main Component
   ═════════════════════════════════════════════════════════ */
export function HomeDemoSection({ isAuthenticated }: HomeDemoSectionProps) {
  // Parallax for the phone section
  const phoneRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: phoneRef, offset: ['start end', 'end start'] });
  const phoneY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <div className="w-full flex flex-col gap-20 sm:gap-28 lg:gap-36">

      {/* ── Section A: How It Works ─────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={stagger}
        className="w-full max-w-3xl mx-auto px-4 order-2 lg:order-1"
      >
        <motion.div variants={fadeUp} className="text-center mb-12 sm:mb-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3 inline-flex items-center gap-2 justify-center">
            <Sparkles className="h-3 w-3 text-primary" />
            How It Works
          </p>
          <h2 className="font-teko text-4xl sm:text-5xl lg:text-6xl font-bold uppercase text-foreground tracking-tight leading-none">
            Three Steps.
            <br className="sm:hidden" /> Zero Friction.
          </h2>
        </motion.div>

        {/* Steps grid with draw-line */}
        <div className="relative">
          <DrawLine />

          <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                variants={fadeUp}
                className="flex flex-col items-center text-center group"
              >
                <StepTile icon={step.icon} number={step.number} index={i} />

                <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase mb-2">
                  Step {step.number}
                </span>

                <h3 className="font-teko text-2xl sm:text-3xl uppercase text-foreground tracking-tight leading-none mb-2">
                  {step.title}
                </h3>

                <p className="font-roboto text-sm text-muted-foreground leading-relaxed italic max-w-[220px]">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ── Section B: Your Music Profile ───────────────── */}
      <motion.section
        ref={phoneRef}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={stagger}
        className="w-full order-1 lg:order-2"
      >
        <motion.div variants={fadeUp} className="text-center mb-6 sm:mb-10 px-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
            The Profile
          </p>
          <h2 className="font-teko text-4xl sm:text-5xl lg:text-6xl font-bold uppercase text-foreground tracking-tight leading-none">
            Your Music, On Display
          </h2>
          <p className="font-roboto italic mt-4 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Playlists, tracks, artists, and albums—organized in one place.
          </p>
        </motion.div>

        {/* Phone with parallax scroll offset */}
        <motion.div variants={scaleIn} style={{ y: phoneY }}>
          <ProfileDemo annotations={true} />
        </motion.div>
      </motion.section>

      {/* ── Section C: Try It Live ──────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
        className="w-full max-w-2xl mx-auto px-4 order-3"
      >
        <motion.div variants={fadeUp} className="text-center mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Try It Now
          </p>
          <h2 className="font-teko text-3xl sm:text-4xl lg:text-5xl font-bold uppercase text-foreground tracking-tight leading-none">
            Tap A Track
          </h2>
          <p className="font-roboto italic mt-3 text-sm text-muted-foreground">
            We&apos;ll hand it off to your player.
          </p>
        </motion.div>

        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-10">
          {demoLinks.map((link, i) => {
            const tapeColors = ['bg-primary/70', 'bg-warning/70', 'bg-accentRoyal/60'];
            const tapeColor = tapeColors[i % tapeColors.length];
            const tapeSide = i % 2 === 0 ? 'left' : 'right';
            const rot = (i - 1) * 2.5;
            return (
              <motion.div
                key={link.title}
                variants={{
                  hidden: { opacity: 0, y: 24, rotate: 0 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    rotate: rot,
                    transition: { duration: 0.5, delay: i * 0.08, ease },
                  },
                }}
                whileHover={{ rotate: 0, y: -4 }}
                className="relative"
                style={{ transformOrigin: 'center' }}
              >
                <span
                  aria-hidden
                  className={`absolute -top-2 z-10 h-5 w-16 rotate-[-6deg] opacity-80 border border-foreground/10 ${tapeColor} ${tapeSide === 'left' ? 'left-4' : 'right-4'}`}
                />
                <Link
                  href={link.href}
                  className="group block relative bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-4 pb-5 shadow-[4px_4px_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_hsl(var(--cassette-white))] hover:shadow-[6px_6px_0_hsl(var(--primary))] dark:hover:shadow-[6px_6px_0_hsl(var(--primary))] transition-shadow"
                >
                  <span className="inline-flex items-center gap-1 bg-foreground text-background font-mono text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 mb-3">
                    <Music2 className="h-2.5 w-2.5" />
                    {link.platform}
                  </span>

                  <p className="font-teko text-2xl sm:text-3xl uppercase leading-[0.95] tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {link.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground italic line-clamp-1">
                    {link.artist}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="h-px flex-1 bg-foreground/20" />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.section>

      {/* ── Section D: CTA ──────────────────────────────── */}
      {!isAuthenticated && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="w-full max-w-xl mx-auto px-4 pb-8 order-4"
        >
          <motion.div
            variants={fadeUp}
            className="relative rounded-none border-2 border-foreground/15 bg-background p-8 sm:p-10 text-center overflow-hidden shadow-[6px_6px_0px_0px] shadow-foreground/10"
          >
            {/* Corner accent marks */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary/30 pointer-events-none" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary/30 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary/30 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary/30 pointer-events-none" />

            <div className="relative">
              <motion.h2
                className="font-teko text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-none"
                variants={fadeUp}
              >
                Ready to share your music everywhere?
              </motion.h2>


              {/* Platform logos with staggered fade-in */}
              <motion.div
                className="flex items-center justify-center gap-4 mt-6"
                variants={stagger}
              >
                {['spotify', 'apple_music', 'deezer'].map((service) => (
                  <motion.div
                    key={service}
                    className="w-8 h-8 relative"
                    variants={{
                      hidden: { opacity: 0, scale: 0.6 },
                      visible: { opacity: 0.65, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
                    }}
                    whileHover={{ opacity: 1, scale: 1.15 }}
                  >
                    <Image
                      src={`/images/${service}_logo_colored.png`}
                      alt={service}
                      width={32}
                      height={32}
                      className="w-full h-full object-contain"
                    />
                  </motion.div>
                ))}
              </motion.div>

              <motion.div className="mt-8" variants={fadeUp}>
                <AnimatedButton
                  text="Create Your Free Account!"
                  onClick={() => window.location.href = '/auth/signup'}
                  height={48}
                  width={280}
                  initialPos={6}
                  colorTop='hsl(var(--primary))'
                  colorBottom='hsl(var(--destructive))'
                  borderColorTop='hsl(var(--primary))'
                  borderColorBottom='hsl(var(--destructive))'
                  textStyle="text-lg sm:text-xl font-bold tracking-wide font-atkinson text-white"
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.section>
      )}
    </div>
  );
}
