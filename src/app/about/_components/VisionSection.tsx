"use client";

import { motion } from "framer-motion";

export function VisionSection() {
  return (
    <section className="bg-muted">
      {/* Thick divider */}
      <div className="h-[3px] bg-foreground/15 dark:bg-border" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Section label */}
          <p className="font-teko text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
            Our Vision
          </p>

          <h2 className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight">
            A Home for Music Curators
          </h2>

          <p className="font-roboto text-lg text-muted-foreground max-w-3xl leading-relaxed mb-6">
            We&apos;re building a platform where modern tastemakers thrive—where
            sharing your taste builds community and earns recognition.
          </p>

          {/* Border-left quote */}
          <div className="border-l-[3px] border-accentTeal pl-6 py-2 mb-6 max-w-2xl">
            <p className="font-roboto text-foreground font-medium text-lg leading-relaxed">
              Curators deserve credit—and rewards—for their influence.
            </p>
          </div>

          <p className="font-roboto text-muted-foreground leading-relaxed">
            Join us to shape what comes next.
          </p>
        </motion.div>
      </div>

      {/* Bottom divider */}
      <div className="h-[3px] bg-foreground/15 dark:bg-border" />
    </section>
  );
}
