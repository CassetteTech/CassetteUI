"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

export function FinalCTA() {
  return (
    <section className="section-wine">
      {/* Top editorial rule */}
      <div className="editorial-rule-thick" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center relative overflow-hidden">
          {/* Decorative cassette logo watermark */}
          <div className="absolute top-4 right-4 w-36 h-36 sm:w-48 sm:h-48 opacity-[0.06] pointer-events-none select-none hidden sm:block -rotate-12">
            <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
          </div>

          {/* Top accent bar */}
          <div className="h-[3px] w-16 bg-primary mx-auto mb-8" />

          <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
            Ready to Unify Your Music?
          </h2>
          <p className="font-roboto text-lg opacity-70 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands breaking down streaming barriers every day.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground font-teko text-xl px-10 py-4 rounded-lg hover:bg-primary/90 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 elev-2"
            >
              <span>Start Sharing Free</span>
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-3 border border-current/30 font-teko text-xl px-10 py-4 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 transition-colors duration-200"
            >
              See Examples
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Bottom editorial rule */}
      <div className="editorial-rule-thick" />
    </section>
  );
}
