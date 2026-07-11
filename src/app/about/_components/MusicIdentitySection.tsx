"use client";

import { motion } from "framer-motion";
import { ProfileDemo } from "@/components/demo/profile-demo";
import { SectionHeader } from "@/components/features/marketing/section-header";
import { DitherEdge } from "@/components/features/marketing/dither-edge";

/**
 * Cream band introducing the profile. The interactive ProfileDemo carries
 * the section alone; the real-profile section right after it does the
 * explaining.
 */
export function MusicIdentitySection() {
  return (
    <section className="section-cream relative">
      <DitherEdge color="hsl(var(--section-cream))" side="top" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <SectionHeader
          kicker="The Profile"
          title="Your Music Identity"
          sub="One home for your taste that any listener can open, whatever they stream with."
          className="mb-14"
        />

        {/* ProfileDemo — the focal panel, centered */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto"
        >
          <div className="bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-5 shadow-flat-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Profile Preview
            </p>
            <ProfileDemo annotations={false} />
            <p className="font-roboto text-xs text-muted-foreground text-center mt-3 italic">
              Interactive demo — your music profile with smart linking.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
