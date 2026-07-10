"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  kicker: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

/**
 * Section header in the pixel hero's voice: mono kicker behind a primary
 * dash, then large flat Teko display type. Inherits the band's text color,
 * so it works on page background and colored bands alike.
 */
export function SectionHeader({
  kicker,
  title,
  sub,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn(
        align === "center" && "flex flex-col items-center text-center",
        className
      )}
    >
      <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] opacity-70 mb-3">
        <span aria-hidden className="inline-block h-[2px] w-8 bg-primary" />
        <span>{kicker}</span>
      </p>
      <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold uppercase leading-[0.9] tracking-tight">
        {title}
      </h2>
      {sub ? (
        <p className="font-roboto text-base italic opacity-70 mt-4 max-w-md">
          {sub}
        </p>
      ) : null}
    </motion.div>
  );
}
