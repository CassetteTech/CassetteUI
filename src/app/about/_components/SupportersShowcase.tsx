"use client";

import { motion } from "framer-motion";

export function SupportersShowcase() {
  return (
    <section className="py-16 md:py-20">
      {/* Thick divider */}
      <div className="h-[3px] bg-foreground/15 dark:bg-border mb-16 md:mb-20" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {/* Section label */}
        <p className="font-teko text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
          Community
        </p>

        <div className="surface-top border border-foreground/15 dark:border-border rounded-lg overflow-hidden">
          <div className="p-8">
            <div className="h-[2px] w-10 bg-warning mb-4" />
            <h3 className="font-teko text-3xl text-foreground mb-2">
              Buy the Team a Coffee
            </h3>
            <p className="font-roboto text-muted-foreground text-sm leading-relaxed">
              Want a closer look? Use the embedded Ko-fi widget to pledge
              support without leaving the page.
            </p>
          </div>
          {/* Ko-fi iframe — bg-[#f9f9f9] is required by the external widget */}
          <div className="bg-[#f9f9f9] px-2 pb-2">
            <iframe
              id="kofiframe"
              src="https://ko-fi.com/cassettetech/?hidefeed=true&widget=true&embed=true&preview=true"
              title="cassettetech"
              className="w-full rounded-lg h-[400px] sm:h-[550px] md:h-[712px]"
              style={{ border: "none", background: "#f9f9f9" }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
