"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuthState } from "@/hooks/use-auth";
import { heroStats } from "../_data";

export function AboutHero() {
  const { isAuthenticated } = useAuthState();
  const primaryCtaHref = isAuthenticated ? "/" : "/auth/signup";

  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Section label */}
        <p className="font-teko text-xs tracking-[0.25em] uppercase text-muted-foreground mb-8">
          About · Cassette Technologies
        </p>

        {/* Title */}
        <h1 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground tracking-tight leading-none mb-6">
          Your Music, Everywhere.
        </h1>

        {/* Subtitle */}
        <p className="font-roboto text-xl sm:text-2xl text-muted-foreground max-w-3xl leading-relaxed mb-10">
          Cassette turns any track, album, or playlist into a single smart link
          that opens in your listener&apos;s preferred app—
          <span className="text-foreground font-medium">
            no dead ends, no friction
          </span>
          .
        </p>

        {/* CTA */}
        <Link
          href={primaryCtaHref}
          className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-teko text-xl px-10 py-4 rounded-lg hover:bg-primary/90 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span>Create Your Universal Link</span>
          <ArrowRight size={20} />
        </Link>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="flex items-center divide-x divide-border mt-16 mb-16"
      >
        {heroStats.map((stat) => (
          <div key={stat.label} className="px-8 sm:px-12 text-center first:pl-0 last:pr-0">
            <p className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-1">
              {stat.value}
            </p>
            <p className="font-roboto text-xs text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Thick divider */}
      <div className="h-[3px] bg-foreground/15 dark:bg-border" />
    </section>
  );
}
