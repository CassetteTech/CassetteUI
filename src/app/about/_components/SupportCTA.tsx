"use client";

import { motion } from "framer-motion";
import { HeartHandshake } from "lucide-react";
import Image from "next/image";
import { openKoFiSupport, KOFI_ICON_SRC } from "@/lib/ko-fi";

export function SupportCTA() {
  return (
    <section className="mb-0">
      {/* Editorial rule */}
      <div className="editorial-rule" />

      <div className="py-16 md:py-20">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="section-label text-muted-foreground mb-8"
        >
          Support
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="surface-top border border-foreground/15 dark:border-border border-l-4 border-l-primary rounded-lg p-8 sm:p-10"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex items-start gap-5">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
                <HeartHandshake className="h-6 w-6" />
              </span>
              <div className="text-left">
                <h3 className="font-teko text-3xl sm:text-4xl text-foreground mb-2 leading-tight">
                  Fuel the Cassette Mission
                </h3>
                <p className="font-roboto text-muted-foreground text-base max-w-xl leading-relaxed">
                  We&apos;re an indie team building better ways to share music.
                  If our story resonates, tap Support to send a Ko-fi.
                </p>
              </div>
            </div>
            <button
              onClick={openKoFiSupport}
              className="inline-flex items-center justify-center gap-3 rounded-lg bg-primary text-primary-foreground font-teko text-xl px-8 py-4 hover:bg-primary/90 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 whitespace-nowrap elev-2"
              aria-label="Support Cassette on Ko-fi"
            >
              <Image
                src={KOFI_ICON_SRC}
                alt="Ko-fi"
                width={24}
                height={24}
                className="rounded-full"
              />
              <span>Support Us</span>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
