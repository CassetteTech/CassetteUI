"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { categoryDefs, categoryColors, getFilteredMembers } from "../_data";
import type { TeamCategory } from "../_data";
import { TeamCard } from "./TeamCard";

interface TeamGridProps {
  onSelectMember: (name: string) => void;
}

export function TeamGrid({ onSelectMember }: TeamGridProps) {
  const [activeCategory, setActiveCategory] = useState<TeamCategory>("all");
  const filteredMembers = getFilteredMembers(activeCategory);

  return (
    <section className="section-cream">
      {/* Top editorial rule */}
      <div className="editorial-rule" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <p className="section-label text-section-cream-fg/60 mb-4">
            The Team
          </p>
          <h2 className="font-teko text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            The People{" "}
            <span className="text-primary">Making It Happen</span>
          </h2>
          <p className="font-roboto text-lg opacity-70 max-w-2xl leading-relaxed">
            Meet the passionate individuals working to make music sharing{" "}
            <span className="font-medium opacity-100">
              effortless for everyone
            </span>
          </p>
        </motion.div>

        {/* Category Filter — color-coded tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-4 overflow-x-auto">
          {categoryDefs.map((category) => {
            const isActive = activeCategory === category.id;
            const colors = categoryColors[category.id];

            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`
                  px-4 py-2 font-teko text-base font-medium whitespace-nowrap
                  border transition-all duration-150
                  ${
                    isActive
                      ? `${colors.activeBg} ${colors.activeBorder}`
                      : "bg-transparent text-muted-foreground border-foreground/15 dark:border-border hover:text-foreground hover:border-foreground/30"
                  }
                  rounded-sm
                `}
              >
                <span className="flex items-center gap-2">
                  {category.label}
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ${
                      isActive
                        ? colors.countBg
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {category.count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Dashed divider below tabs */}
        <div className="editorial-rule-dashed mb-12" />

        {/* Team Grid */}
        <AnimatePresence mode="wait">
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
                    ease: [0.23, 1, 0.32, 1],
                  }}
                >
                  <TeamCard
                    member={member}
                    index={index}
                    onClick={() => onSelectMember(member.name)}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom editorial rule */}
      <div className="editorial-rule" />
    </section>
  );
}
