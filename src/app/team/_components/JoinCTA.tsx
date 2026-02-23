"use client";

import { motion } from "framer-motion";
import { Mail } from "lucide-react";

export function JoinCTA() {
  return (
    <section className="mt-0">
      {/* Thick divider */}
      <div className="h-[3px] bg-foreground/15 dark:bg-border" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="my-16 md:my-20 rounded-lg bg-foreground text-background dark:bg-card dark:text-foreground overflow-hidden"
      >
        {/* Top accent bar */}
        <div className="h-[2px] bg-primary" />

        <div className="py-16 md:py-20 px-8 text-center">
          <h2 className="font-teko text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            Want to Join Us?
          </h2>
          <p className="font-roboto text-lg text-background/70 dark:text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            We&apos;re always looking for passionate people who share our
            vision. Whether you&apos;re a developer, designer, or music
            enthusiast, we&apos;d love to hear from you.
          </p>

          <a
            href="mailto:team@cassette.com"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-teko text-xl px-10 py-4 rounded-lg hover:bg-primary/90 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Mail size={20} />
            <span>Get in Touch</span>
          </a>
        </div>

        {/* Bottom accent bar */}
        <div className="h-[2px] bg-primary" />
      </motion.div>
    </section>
  );
}
