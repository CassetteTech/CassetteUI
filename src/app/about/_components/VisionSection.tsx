"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/features/marketing/section-header";
import { DitherEdge } from "@/components/features/marketing/dither-edge";
import { PixelSun } from "@/components/features/marketing/pixel-sun";

/**
 * Closing statement band. Mirrors the Problem band's flat display-type
 * layout; the pixel sun sets low in warning gold to bookend the sheet.
 */
export function VisionSection() {
  return (
    <section className="section-dark relative">
      <DitherEdge color="hsl(var(--section-dark))" side="top" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative overflow-hidden">
        <PixelSun className="absolute -bottom-20 -right-8 w-52 sm:w-72 text-warning opacity-[0.16] pointer-events-none select-none" />

        <SectionHeader
          kicker="Our Vision"
          title={
            <>
              A Home For
              <br />
              Curators
            </>
          }
          className="mb-10"
        />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-teko text-3xl sm:text-4xl lg:text-5xl uppercase leading-[0.95] tracking-tight max-w-3xl"
        >
          Curators deserve{" "}
          <span className="text-primary">credit—and rewards—</span>
          for their influence.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 max-w-xl font-roboto text-sm sm:text-base italic opacity-80 leading-relaxed border-l-2 border-primary/70 pl-4"
        >
          We&apos;re building a platform where modern tastemakers thrive—where
          sharing your taste builds community and earns recognition. Join us to
          shape what comes next.
        </motion.p>
      </div>
    </section>
  );
}
