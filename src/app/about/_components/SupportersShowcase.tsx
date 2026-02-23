"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { KOFI_ICON_SRC } from "@/lib/ko-fi";

export function SupportersShowcase() {
  return (
    <section className="section-cream">
      <div className="editorial-rule" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <Image
              src={KOFI_ICON_SRC}
              alt="Ko-fi"
              width={28}
              height={28}
              className="rounded-full"
            />
            <h3 className="font-teko text-3xl sm:text-4xl text-foreground leading-tight">
              Buy the Team a Coffee
            </h3>
          </div>
          <p className="font-roboto text-muted-foreground text-sm mb-8">
            Fuel development — support goes directly to the team.
          </p>

          {/* Ko-fi embed — constrained to form width and centered.
             The container is shorter than the iframe; pt pushes the
             form down so it sits visually centred, and overflow-hidden
             clips the empty whitespace that falls below the fold. */}
          <div className="w-full max-w-md h-[480px] sm:h-[540px] md:h-[620px] rounded-xl overflow-hidden elev-2">
            <iframe
              id="kofiframe"
              src="https://ko-fi.com/cassettetech/?hidefeed=true&widget=true&embed=true&preview=true"
              title="Support Cassette on Ko-fi"
              className="w-full h-[540px] sm:h-[600px] md:h-[712px] pt-6 sm:pt-8 md:pt-10"
              style={{ border: "none", background: "#f9f9f9" }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
