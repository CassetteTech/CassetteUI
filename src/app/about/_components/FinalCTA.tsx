"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

export function FinalCTA() {
  return (
    <section className="section-wine">
      <div className="editorial-rule-thick" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center relative overflow-hidden">
        <div className="absolute top-4 right-4 w-36 h-36 sm:w-48 sm:h-48 opacity-[0.08] pointer-events-none select-none hidden sm:block -rotate-12">
          <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="-rotate-[1deg] inline-block"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-70 mb-3">
            Last Stop
          </p>
          <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold uppercase leading-none tracking-tight mb-4">
            Unify Your Music
            <span
              aria-hidden
              className="ml-1 inline-block h-6 sm:h-8 lg:h-10 w-1.5 bg-primary align-baseline animate-pulse"
            />
          </h2>
          <p className="font-roboto text-base sm:text-lg opacity-80 italic max-w-xl mx-auto leading-relaxed">
            Join the listeners tearing down streaming walls, one smart link at a
            time.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-3 bg-primary border-2 border-foreground text-primary-foreground font-mono text-[12px] uppercase tracking-[0.25em] px-6 py-3 shadow-[4px_4px_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_hsl(var(--foreground))] transition-all"
          >
            <span>Start Sharing Free</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/profile/matttoppi"
            className="inline-flex items-center justify-center gap-3 bg-background border-2 border-foreground text-foreground font-mono text-[12px] uppercase tracking-[0.25em] px-6 py-3 shadow-[4px_4px_0_hsl(var(--foreground))] hover:bg-primary-foreground hover:-translate-y-0.5 hover:shadow-[6px_6px_0_hsl(var(--primary))] transition-all"
          >
            See An Example
          </Link>
        </motion.div>
      </div>

      <div className="editorial-rule-thick" />
    </section>
  );
}
