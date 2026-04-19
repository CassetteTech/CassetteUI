"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function VisionSection() {
  return (
    <section className="section-dark">
      <div className="editorial-rule-thick" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute -top-2 right-0 w-44 h-44 sm:w-56 sm:h-56 opacity-[0.06] pointer-events-none select-none hidden sm:block">
          <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="-rotate-[1.5deg] inline-block mb-10"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60 mb-3">
            Our Vision
          </p>
          <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold uppercase leading-none tracking-tight">
            A Home For
            <br />
            Curators
            <span
              aria-hidden
              className="ml-1 inline-block h-6 sm:h-8 lg:h-10 w-1.5 bg-primary align-baseline animate-pulse"
            />
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative max-w-2xl"
        >
          <span
            aria-hidden
            className="absolute -top-2 right-6 z-10 h-5 w-20 rotate-[4deg] opacity-80 border border-foreground/10 bg-accentRoyal/60"
          />
          <div className="bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-6 sm:p-8 shadow-[6px_6px_0_hsl(var(--cassette-white))]">
            <p className="font-teko text-2xl sm:text-3xl uppercase tracking-tight leading-tight mb-4">
              Curators deserve credit—and rewards—for their influence.
            </p>
            <p className="font-roboto text-muted-foreground text-sm leading-relaxed italic border-l-2 border-foreground/20 pl-3">
              We&apos;re building a platform where modern tastemakers
              thrive—where sharing your taste builds community and earns
              recognition. Join us to shape what comes next.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="editorial-rule-thick" />
    </section>
  );
}
