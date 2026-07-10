"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatStripProps {
  items: { value: string; label: string }[];
  className?: string;
}

/**
 * Quiet liner-notes stat row — flat ruled columns, no cards. Opens the
 * content sheet on both /about and /team.
 */
export function StatStrip({ items, className }: StatStripProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn(
        "grid border-y-2 border-foreground/15 divide-x-2 divide-foreground/15",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <div key={item.label} className="px-4 sm:px-6 py-6 sm:py-8">
          <p className="font-teko text-4xl sm:text-5xl font-bold text-foreground leading-none">
            {item.value}
          </p>
          <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2">
            {item.label}
          </p>
        </div>
      ))}
    </motion.div>
  );
}
