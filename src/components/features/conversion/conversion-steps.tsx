'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { ContentType } from '@/hooks/use-simulated-progress';

interface Step {
  name: string;
  duration: number;
}

interface ConversionStepsProps {
  steps: Step[];
  currentStep: number;
  contentType: ContentType;
  className?: string;
}

/**
 * Connected timeline stepper for the conversion flow.
 *
 * Layout: horizontal on desktop, vertical on mobile. A muted connector line runs
 * between step nodes with a primary-colored fill that grows as steps complete,
 * so the eye reads progression as a single gesture rather than three isolated pills.
 */
export const ConversionSteps: React.FC<ConversionStepsProps> = ({
  steps,
  currentStep,
  contentType,
  className = ''
}) => {
  const totalSegments = Math.max(steps.length - 1, 1);
  const completedSegments = Math.min(currentStep, totalSegments);
  const fillPercent = (completedSegments / totalSegments) * 100;

  return (
    <div
      className={`rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-5 sm:p-6 ${className}`}
    >
      <div className="text-center mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Converting {contentType}
        </p>
      </div>

      {/* Desktop: horizontal timeline */}
      <div className="hidden sm:block">
        <div className="relative">
          {/* Connector track (behind the nodes) */}
          <div className="absolute left-4 right-4 top-4 h-[2px] bg-border/60 rounded-full" />
          <motion.div
            className="absolute left-4 top-4 h-[2px] bg-primary rounded-full origin-left"
            initial={false}
            animate={{ width: `calc((100% - 2rem) * ${fillPercent / 100})` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />

          <div className="relative flex justify-between items-start gap-2">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              return (
                <StepNode
                  key={step.name}
                  index={index}
                  name={step.name}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: vertical timeline */}
      <div className="sm:hidden">
        <div className="relative flex flex-col gap-4 pl-1">
          {/* Vertical connector track */}
          <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-border/60 rounded-full" />
          <motion.div
            className="absolute left-[15px] top-2 w-[2px] bg-primary rounded-full origin-top"
            initial={false}
            animate={{ height: `calc((100% - 1rem) * ${fillPercent / 100})` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />

          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            return (
              <div key={step.name} className="relative flex items-center gap-3">
                <StepBadge index={index} isCompleted={isCompleted} isCurrent={isCurrent} />
                <StepLabel name={step.name} isCompleted={isCompleted} isCurrent={isCurrent} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface StepNodeProps {
  index: number;
  name: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

const StepNode: React.FC<StepNodeProps> = ({ index, name, isCompleted, isCurrent }) => (
  <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
    <StepBadge index={index} isCompleted={isCompleted} isCurrent={isCurrent} />
    <StepLabel name={name} isCompleted={isCompleted} isCurrent={isCurrent} centered />
  </div>
);

const StepBadge: React.FC<{ index: number; isCompleted: boolean; isCurrent: boolean }> = ({
  index,
  isCompleted,
  isCurrent
}) => (
  <div className="relative flex items-center justify-center">
    {isCurrent && (
      <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
    )}
    <motion.div
      layout
      className={`
        relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 text-[11px] font-bold
        transition-colors duration-300
        ${isCompleted
          ? 'bg-success border-success text-white'
          : isCurrent
            ? 'bg-primary border-primary text-white shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]'
            : 'bg-background border-border text-muted-foreground'}
      `}
    >
      {isCompleted ? <Check className="w-4 h-4" strokeWidth={3} /> : <span>{index + 1}</span>}
    </motion.div>
  </div>
);

const StepLabel: React.FC<{
  name: string;
  isCompleted: boolean;
  isCurrent: boolean;
  centered?: boolean;
}> = ({ name, isCompleted, isCurrent, centered }) => (
  <div
    className={`
      relative overflow-hidden rounded-md px-1
      ${centered ? 'text-center' : 'text-left'}
    `}
  >
    <span
      className={`
        relative z-10 text-xs font-medium transition-colors duration-300
        ${isCurrent ? 'text-foreground' : isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/70'}
      `}
    >
      {name}
    </span>
    {isCurrent && (
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer-sweep"
      />
    )}
  </div>
);
