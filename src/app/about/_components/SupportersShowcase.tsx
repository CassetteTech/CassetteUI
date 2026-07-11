"use client";

import { motion } from "framer-motion";
import { DitherEdge } from "@/components/features/marketing/dither-edge";
import { KofiIcon } from "@/components/ui/kofi-icon";
import { openKoFiSupport } from "@/lib/ko-fi";

/**
 * Cream band carrying the Ko-fi embed after the dark statement band —
 * the page's single support section (the old Fuel The Mission strip
 * folded into it). Kept light so it blends with the widget's background.
 */
export function SupportersShowcase() {
  return (
    <section className="section-cream relative">
      <DitherEdge color="hsl(var(--section-cream))" side="top" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="flex items-center gap-3 mb-2">
            <KofiIcon width={28} className="rounded-full" />
            <h3 className="font-teko text-3xl sm:text-4xl uppercase tracking-tight leading-none">
              Buy The Team A Coffee
            </h3>
          </div>
          <p className="font-roboto text-sm italic opacity-70 mb-8">
            Indie team, indie budget — support goes directly to development.
          </p>

          {/* Ko-fi embed — constrained to form width and centered.
             The iframe is taller than its own content and scrolling is
             disabled, so the widget never scrolls internally; the container
             is sized to show the full form and overflow-hidden clips the
             empty whitespace that falls below it. */}
          <div className="w-full max-w-md h-[620px] md:h-[640px] border-2 border-foreground overflow-hidden">
            <iframe
              id="kofiframe"
              src="https://ko-fi.com/cassettetech/?hidefeed=true&widget=true&embed=true&preview=true"
              title="Support Cassette on Ko-fi"
              scrolling="no"
              className="w-full h-[760px] pt-6 sm:pt-8 md:pt-10"
              style={{ border: "none", background: "#f9f9f9" }}
            />
          </div>

          {/* Full Ko-fi page, for anyone who'd rather not use the embed */}
          <button
            onClick={openKoFiSupport}
            className="mt-8 inline-flex items-center justify-center gap-3 bg-background border-2 border-foreground text-foreground font-mono text-[11px] uppercase tracking-[0.25em] px-5 py-3 shadow-flat-4 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-flat-primary-6 transition-[color,background-color,border-color,box-shadow] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Support Cassette on Ko-fi"
          >
            <KofiIcon width={20} className="rounded-full" />
            <span>Support Us</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
