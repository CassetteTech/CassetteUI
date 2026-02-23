"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function VisionSection() {
  return (
    <section className="section-dark">
      {/* Thick editorial rule */}
      <div className="editorial-rule-thick" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative overflow-hidden">
        {/* Decorative cassette logo watermark */}
        <div className="absolute -top-2 right-0 w-44 h-44 sm:w-56 sm:h-56 opacity-[0.04] pointer-events-none select-none hidden sm:block">
          <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Section label */}
          <p className="section-label opacity-60 mb-4">
            Our Vision
          </p>

          <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            A Home for Music Curators
          </h2>

          <p className="font-roboto text-lg opacity-70 max-w-3xl leading-relaxed mb-8">
            We&apos;re building a platform where modern tastemakers thrive—where
            sharing your taste builds community and earns recognition.
          </p>

          {/* Pull-quote — explicit text-foreground to override section color on the light pullquote bg */}
          <div className="pullquote max-w-2xl mb-8 text-foreground">
            <p className="font-roboto text-xl sm:text-2xl font-medium leading-relaxed relative z-10">
              Curators deserve credit—and rewards—for their influence.
            </p>
          </div>

          <p className="font-roboto opacity-60 leading-relaxed">
            Join us to shape what comes next.
          </p>
        </motion.div>
      </div>

      {/* Bottom editorial rule */}
      <div className="editorial-rule-thick" />
    </section>
  );
}
