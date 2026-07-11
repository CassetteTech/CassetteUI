'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ConversionHeadingProps {
  kicker: string;
  headline: string;
  className?: string;
}

/**
 * Kicker + headline pair that narrates an in-flight conversion above the
 * beamed bar/card. Rendered inside an AnimatePresence by callers so it can
 * fade away with the rest of the converting state.
 */
export const ConversionHeading: React.FC<ConversionHeadingProps> = ({ kicker, headline, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.35, ease: 'easeOut' }}
    className={cn('text-center', className)}
  >
    <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
      {kicker}
    </p>
    <p className="font-teko text-2xl sm:text-3xl font-bold uppercase tracking-wide leading-none text-foreground">
      {headline}
    </p>
  </motion.div>
);
