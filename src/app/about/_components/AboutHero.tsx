"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useAuthState } from "@/hooks/use-auth";
import { heroStats } from "../_data";

const statColors = ["bg-primary", "bg-info", "bg-accentRoyal"];

export function AboutHero() {
  const { isAuthenticated } = useAuthState();
  const primaryCtaHref = isAuthenticated ? "/" : "/auth/signup";

  return (
    <section className="relative overflow-hidden">
      {/* Decorative cassette logo watermark — oversized editorial background mark */}
      <div
        className="absolute top-0 -right-16 sm:-right-10 lg:-right-4 w-[28rem] h-[28rem] sm:w-[36rem] sm:h-[36rem] lg:w-[42rem] lg:h-[42rem] opacity-[0.03] pointer-events-none select-none hidden sm:block"
        style={{ transform: "rotate(-12deg)" }}
      >
        <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Section label */}
        <p className="section-label text-muted-foreground mb-8">
          About &middot; Cassette Technologies
        </p>

        {/* Title */}
        <h1 className="font-teko text-6xl sm:text-7xl lg:text-8xl font-bold text-foreground tracking-tight leading-none mb-6">
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
          className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-teko text-xl px-10 py-4 rounded-lg hover:bg-primary/90 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 elev-2"
        >
          <span>Create Your Universal Link</span>
          <ArrowRight size={20} />
        </Link>
      </motion.div>

      {/* Stats — editorial scoreboard */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="grid grid-cols-3 gap-4 sm:gap-6 max-w-xl mt-16 mb-16"
      >
        {heroStats.map((stat, i) => (
          <div key={stat.label} className="text-center sm:text-left">
            <div className={`h-[3px] ${statColors[i]} mb-4 w-12 mx-auto sm:mx-0`} />
            <p className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-1">
              {stat.value}
            </p>
            <p className="section-label text-muted-foreground text-[0.625rem] justify-center sm:justify-start">
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Editorial rule */}
      <div className="editorial-rule-thick" />
    </section>
  );
}
