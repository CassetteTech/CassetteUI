"use client";

import { motion } from "framer-motion";
import { HeartHandshake } from "lucide-react";
import Image from "next/image";
import { openKoFiSupport, KOFI_ICON_SRC } from "@/lib/ko-fi";

export function SupportCTA() {
  return (
    <section className="py-16 md:py-20">
      <div className="editorial-rule mb-12" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative max-w-3xl mx-auto"
      >
        <span
          aria-hidden
          className="absolute -top-2 left-10 z-10 h-5 w-20 rotate-[-6deg] opacity-80 border border-foreground/10 bg-primary/70"
        />
        <span
          aria-hidden
          className="absolute -bottom-2 right-10 z-10 h-5 w-20 rotate-[4deg] opacity-80 border border-foreground/10 bg-warning/70"
        />

        <div
          className="bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-6 sm:p-8 shadow-[6px_6px_0_hsl(var(--foreground))] dark:shadow-[6px_6px_0_hsl(var(--cassette-white))]"
          style={{ transform: "rotate(-1deg)" }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Support
          </p>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground flex-shrink-0">
                <HeartHandshake className="h-6 w-6" />
              </span>
              <div className="text-left">
                <h3 className="font-teko text-3xl sm:text-4xl uppercase tracking-tight leading-none text-foreground mb-2">
                  Fuel The Mission
                </h3>
                <p className="font-roboto text-muted-foreground text-sm max-w-xl leading-relaxed italic">
                  Indie team, indie budget. If our story resonates, drop a
                  Ko-fi.
                </p>
              </div>
            </div>
            <button
              onClick={openKoFiSupport}
              className="inline-flex items-center justify-center gap-3 bg-background border-2 border-foreground text-foreground font-mono text-[11px] uppercase tracking-[0.25em] px-5 py-3 shadow-[4px_4px_0_hsl(var(--foreground))] hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-[6px_6px_0_hsl(var(--primary))] transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Support Cassette on Ko-fi"
            >
              <Image
                src={KOFI_ICON_SRC}
                alt="Ko-fi"
                width={20}
                height={20}
                className="rounded-full"
              />
              <span>Support Us</span>
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
