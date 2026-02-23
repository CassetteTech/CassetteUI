"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section>
      {/* Thick divider */}
      <div className="h-[3px] bg-foreground/15 dark:bg-border" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-foreground text-background dark:bg-card dark:text-foreground"
      >
        {/* Top accent bar */}
        <div className="h-[2px] bg-primary" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
          <h2 className="font-teko text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            Ready to Unify Your Music?
          </h2>
          <p className="font-roboto text-lg text-background/70 dark:text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands breaking down streaming barriers every day.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground font-teko text-xl px-10 py-4 rounded-lg hover:bg-primary/90 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span>Start Sharing Free</span>
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-3 border border-background/30 dark:border-border font-teko text-xl px-10 py-4 rounded-lg hover:bg-background/10 dark:hover:bg-muted/20 transition-colors duration-200"
            >
              See Examples
            </Link>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div className="h-[2px] bg-primary" />
      </motion.div>
    </section>
  );
}
