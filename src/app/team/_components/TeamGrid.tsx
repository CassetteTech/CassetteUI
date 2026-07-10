"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/features/marketing/section-header";
import { categoryDefs, getFilteredMembers } from "../_data";
import type { TeamCategory } from "../_data";
import { TeamCard } from "./TeamCard";
import { EASE_OUT_QUART } from "@/lib/motion";

interface TeamGridProps {
  onSelectMember: (name: string) => void;
}

/**
 * The roster. Filters are quiet mono tabs on a ruled strip (a pixel square
 * marks the active one) instead of filled color chips; the people cards are
 * the focal elements of the page.
 */
export function TeamGrid({ onSelectMember }: TeamGridProps) {
  const [activeCategory, setActiveCategory] = useState<TeamCategory>("all");
  const filteredMembers = getFilteredMembers(activeCategory);

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
      <SectionHeader
        kicker="The Roster"
        title={
          <>
            The People
            <br />
            Behind It
          </>
        }
        sub="Passionate individuals making music sharing effortless for everyone."
        className="mb-10"
      />

      {/* Category filter — ruled mono strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y-2 border-foreground/15 py-3 mb-10">
        {categoryDefs.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "inline-flex items-center gap-2 py-1 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 transition-colors",
                  isActive ? "bg-primary" : "bg-foreground/20"
                )}
              />
              {category.label}
              <span className="opacity-60">{category.count}</span>
            </button>
          );
        })}
      </div>

      {/* Team Grid */}
      <AnimatePresence>
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredMembers.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <Users className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="font-teko text-2xl text-muted-foreground">
                No team members in this category
              </p>
            </div>
          ) : (
            filteredMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                  ease: EASE_OUT_QUART,
                }}
              >
                <TeamCard
                  member={member}
                  onClick={() => onSelectMember(member.name)}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
