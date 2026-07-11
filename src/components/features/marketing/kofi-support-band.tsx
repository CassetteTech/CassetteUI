"use client";

import { motion } from "framer-motion";
import { openKoFiSupport } from "@/lib/ko-fi";
import { KofiIcon } from "@/components/ui/kofi-icon";

interface KofiSupportBandProps {
  title: string;
  copy: string;
}

/**
 * Quiet ruled support strip — no card, no tape. The button keeps its offset
 * shadow as the single focal element of the row.
 */
export function KofiSupportBand({ title, copy }: KofiSupportBandProps) {
  return (
    <section className="py-16 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-y-2 border-foreground/15 py-8 sm:py-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-10"
      >
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Support
          </p>
          <h3 className="font-teko text-3xl sm:text-4xl uppercase tracking-tight leading-none text-foreground">
            {title}
          </h3>
          <p className="font-roboto text-muted-foreground text-sm italic mt-2 max-w-xl leading-relaxed">
            {copy}
          </p>
        </div>

        <button
          onClick={openKoFiSupport}
          className="inline-flex items-center justify-center gap-3 self-start md:self-auto bg-background border-2 border-foreground text-foreground font-mono text-[11px] uppercase tracking-[0.25em] px-5 py-3 shadow-flat-4 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-flat-primary-6 transition-[color,background-color,border-color,box-shadow] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Support Cassette on Ko-fi"
        >
          <KofiIcon width={20} className="rounded-full" />
          <span>Support Us</span>
        </button>
      </motion.div>
    </section>
  );
}
