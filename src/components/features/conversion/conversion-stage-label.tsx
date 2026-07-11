'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ConversionStageLabelProps {
  label: string;
  className?: string;
}

/**
 * Live Bridge stage readout shown while a conversion runs. Each stage
 * change crossfades with a small vertical drift so the label reads as a
 * ticker rather than flickering text.
 */
export const ConversionStageLabel: React.FC<ConversionStageLabelProps> = ({ label, className }) => (
  <AnimatePresence mode="wait">
    <motion.span
      key={label}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground',
        className,
      )}
      aria-live="polite"
    >
      {label}
    </motion.span>
  </AnimatePresence>
);
