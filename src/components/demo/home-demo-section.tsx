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
    <div ref={ref} className="hidden sm:block absolute top-8 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-0.5 overflow-hidden">
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

/* ─── Step icon ───────────────────────────────────────── */
function StepIcon({ icon: Icon, index }: { icon: typeof Link2; index: number }) {
  return (
    <motion.div
      className="relative z-10 w-14 h-14 flex items-center justify-center mb-5"
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, delay: index * 0.1, ease },
        },
      }}
    >
      <div className="w-full h-full rounded-none border-2 border-foreground/20 bg-background flex items-center justify-center shadow-[4px_4px_0px_0px] shadow-foreground/10">
        <Icon className="h-5 w-5 text-foreground" />
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
          <div
            className="inline-flex items-center gap-2 rounded-none border-2 border-foreground/20 bg-background px-4 py-1.5 text-xs font-bold text-muted-foreground mb-5 shadow-[3px_3px_0px_0px] shadow-foreground/10"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-teko text-sm tracking-wider text-primary uppercase">How It Works</span>
          </div>
          <h2 className="font-teko text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-none">
            Three steps. Zero friction.
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
                <StepIcon icon={step.icon} index={i} />

                <span className="font-teko text-[11px] tracking-[0.25em] text-muted-foreground uppercase mb-1.5">
                  Step {step.number}
                </span>

                <h3 className="font-teko text-xl sm:text-2xl text-foreground leading-tight mb-2">
                  {step.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">
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
          <h2 className="font-teko text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-none">
            Your Music Profile
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Showcase your taste — playlists, tracks, artists, and albums — beautifully organized in one place.
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
          <h2 className="font-teko text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-none">
            Try It Live
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Click any card to see Cassette convert a real link.
          </p>
        </motion.div>

        <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {demoLinks.map((link, i) => (
            <motion.div
              key={link.title}
              variants={{
                hidden: { opacity: 0, y: 24, rotateX: 8 },
                visible: {
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  transition: { duration: 0.6, delay: i * 0.08, ease },
                },
              }}
            >
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Link
                  href={link.href}
                  className="group block relative rounded-none border-2 border-foreground/15 bg-background p-5 overflow-hidden shadow-[5px_5px_0px_0px] shadow-foreground/10 hover:shadow-[2px_2px_0px_0px] hover:shadow-foreground/10 hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-100"
                >
                  {/* Accent bar — hard edge */}
                  <div className={`h-1 w-10 bg-gradient-to-r ${link.accent} mb-4 group-hover:w-14 transition-all duration-100`} />

                  <p className="font-teko text-lg text-foreground leading-tight truncate">
                    {link.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {link.artist}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-none bg-muted border border-border px-2.5 py-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider font-teko">
                      <Music2 className="h-3 w-3" />
                      {link.platform}
                    </span>
                    <motion.div
                      initial={{ opacity: 0, x: -4 }}
                      whileHover={{ opacity: 1, x: 0 }}
                      className="text-muted-foreground"
                    >
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </motion.div>
                  </div>
                </Link>
              </motion.div>
            </motion.div>
          ))}
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
