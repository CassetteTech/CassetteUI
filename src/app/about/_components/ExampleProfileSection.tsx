"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Headphones, ListMusic, Disc3, UserRound } from "lucide-react";

const stats = [
  { icon: ListMusic, label: "Playlists", value: "18" },
  { icon: Disc3, label: "Albums", value: "42" },
  { icon: Headphones, label: "Top Tracks", value: "120" },
  { icon: UserRound, label: "Following", value: "37" },
];

const services = ["spotify", "apple_music", "deezer"] as const;

export function ExampleProfileSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="editorial-rule-thick mb-16 md:mb-20" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-10 -rotate-[1.5deg] inline-block"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
          A Real Profile
        </p>
        <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold uppercase tracking-tight leading-none text-foreground">
          See One In The Wild
          <span
            aria-hidden
            className="ml-1 inline-block h-6 sm:h-8 lg:h-10 w-1.5 bg-primary align-baseline animate-pulse"
          />
        </h2>
        <p className="font-roboto text-base text-muted-foreground italic mt-4 max-w-md">
          This is what your Cassette looks like once you move in.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20, rotate: 0 }}
        whileInView={{ opacity: 1, y: 0, rotate: -1.2 }}
        whileHover={{ rotate: 0, y: -4 }}
        viewport={{ once: true, margin: "-5%" }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative max-w-2xl mx-auto"
        style={{ transformOrigin: "center" }}
      >
        <span
          aria-hidden
          className="absolute -top-2 left-8 z-10 h-5 w-20 rotate-[-6deg] opacity-80 border border-foreground/10 bg-warning/70"
        />
        <span
          aria-hidden
          className="absolute -bottom-2 right-8 z-10 h-5 w-20 rotate-[4deg] opacity-80 border border-foreground/10 bg-accentRoyal/60"
        />

        <Link
          href="/profile/matttoppi"
          className="group block bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-6 sm:p-8 shadow-[6px_6px_0_hsl(var(--foreground))] dark:shadow-[6px_6px_0_hsl(var(--cassette-white))] hover:shadow-[8px_8px_0_hsl(var(--primary))] dark:hover:shadow-[8px_8px_0_hsl(var(--primary))] transition-shadow"
        >
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 border-2 border-foreground rounded-full overflow-hidden bg-muted">
              <Image
                src="/images/cassette_logo.png"
                alt="@matttoppi avatar"
                fill
                className="object-contain p-2"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                Cassette profile
              </p>
              <h3 className="font-teko text-3xl sm:text-4xl uppercase leading-none tracking-tight truncate group-hover:text-primary transition-colors">
                Matt Toppi
              </h3>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                @matttoppi
              </p>
            </div>
            <ArrowRight className="hidden sm:block h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
          </div>

          <p className="mt-5 text-sm text-foreground/80 italic border-l-2 border-foreground/30 pl-3">
            Music enthusiast, playlist curator, always digging.
          </p>

          <div className="mt-5 flex items-center gap-2">
            {services.map((svc) => (
              <div key={svc} className="h-6 w-6 relative">
                <Image
                  src={`/images/${svc}_logo_colored.png`}
                  alt={svc}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
            ))}
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              3 platforms linked
            </span>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2 border-t-2 border-foreground/20 pt-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
                <p className="font-teko text-xl sm:text-2xl leading-none text-foreground">
                  {value}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2">
            <span className="h-px flex-1 bg-foreground/20" />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Tap to visit the full profile
            </span>
            <span className="h-px flex-1 bg-foreground/20" />
          </div>
        </Link>
      </motion.div>
    </section>
  );
}
