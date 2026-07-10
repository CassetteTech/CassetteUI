"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import Image from "next/image";
import { DITHER_BAND_MASK_TOP } from "@/components/features/marketing/dither-edge";
import heroHalftone from "@/assets/images/hero-halftone.webp";

/**
 * Closing CTA — navy band bookended with the hero halftone (framed on the
 * pink sky this time), with a quiet link back to /about. The band itself is
 * dither-masked at the top so the dissolving pixels carry the image texture.
 */
export function JoinCTA() {
  return (
    <section className="relative">
      <div
        className="section-navy relative overflow-hidden -mt-6"
        style={DITHER_BAND_MASK_TOP}
      >
        {/* Bookend: same halftone as the hero, dimmed under the navy band */}
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none select-none">
          <Image
            src={heroHalftone}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-top"
            aria-hidden="true"
          />
        </div>

        {/* Extra 24px of top padding compensates for the masked seam zone */}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-[6.5rem] pb-20 md:pt-[8.5rem] md:pb-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-teko text-6xl sm:text-7xl lg:text-8xl font-bold uppercase leading-[0.9] tracking-tight mb-4">
              Want To{" "}
              <span className="whitespace-nowrap">
                Join?
                <span
                  aria-hidden
                  className="ml-2 inline-block h-7 sm:h-9 lg:h-11 w-2 bg-primary align-baseline animate-pulse"
                />
              </span>
            </h2>
            <p className="font-roboto text-base sm:text-lg opacity-80 italic max-w-xl mx-auto leading-relaxed">
              Developers, designers, music nerds—if our mission resonates,
              we&apos;d love to hear from you.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mt-10 flex justify-center"
          >
            <a
              href="mailto:team@cassette.tech"
              className="inline-flex items-center justify-center gap-3 bg-primary border-2 border-foreground text-primary-foreground font-mono text-[12px] uppercase tracking-[0.25em] px-6 py-3 shadow-flat-4 hover:-translate-y-0.5 hover:shadow-flat-6 transition-[transform,box-shadow]"
            >
              <Mail size={16} />
              <span>Get In Touch</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-12"
          >
            <Link
              href="/about"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] opacity-80 hover:opacity-100 hover:text-primary transition-[color,opacity]"
            >
              <span>Read our story</span>
              <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
