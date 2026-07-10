"use client";

import { motion } from "framer-motion";
import { ProfileDemo } from "@/components/demo/profile-demo";
import { SectionHeader } from "@/components/features/marketing/section-header";
import { DitherEdge } from "@/components/features/marketing/dither-edge";
import { identityTiles } from "../_data";

/**
 * Cream band introducing the profile. The interactive ProfileDemo is the
 * focal element; the identity copy sits beside it as flat ruled entries.
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* ProfileDemo — focal panel, left column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5"
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

          <div className="lg:col-span-7">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="font-teko text-2xl sm:text-3xl uppercase tracking-tight leading-tight max-w-xl"
            >
              A home for your taste—playlists, recent finds, top artists—
              <span className="text-primary">beautifully organized</span>.
            </motion.p>

            <motion.dl
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5"
            >
              {identityTiles.map((tile) => (
                <div
                  key={tile.title}
                  className="border-l-2 border-foreground/20 pl-3"
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
                    {tile.title}
                  </dt>
                  <dd className="font-roboto text-sm mt-1">{tile.desc}</dd>
                </div>
              ))}
            </motion.dl>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 font-roboto text-sm italic opacity-70 max-w-xl leading-relaxed"
            >
              Everything on it is a smart link—whoever taps lands in their own
              player, not yours.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
