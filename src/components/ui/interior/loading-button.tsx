"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const CROSSFADE = { type: "spring", stiffness: 260, damping: 34, mass: 0.8 } as const;
const INSTANT = { duration: 0 } as const;

function Spinner({ still }: { still: boolean }) {
  return (
    <motion.svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
      animate={still ? undefined : { rotate: 360 }}
      transition={
        still ? undefined : { duration: 0.85, repeat: Infinity, ease: "linear" }
      }
    >
      <circle
        cx="6"
        cy="6"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.22"
      />
      <path
        d="M10.5 6A4.5 4.5 0 0 0 6 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

export type PendingLabelProps = {
  pending: boolean;
  label: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
};

/**
 * Crossfades an idle label with a spinner + pending label inside an existing
 * button. Faces are stacked in one grid cell, so the width stays reserved at
 * the widest face — no layout jump when the pending state toggles.
 * Use when the caller already owns the async lifecycle (forms, stores).
 */
export function PendingLabel({
  pending,
  label,
  pendingLabel = label,
  className = "",
}: PendingLabelProps) {
  const reduced = useReducedMotion();
  const fade = reduced ? INSTANT : CROSSFADE;

  const faces = [
    { key: "idle", active: !pending, content: label },
    {
      key: "pending",
      active: pending,
      content: (
        <>
          <Spinner still={reduced === true || !pending} />
          {pendingLabel}
        </>
      ),
    },
  ];

  return (
    <span aria-busy={pending || undefined} className={`relative grid place-items-center ${className}`}>
      {faces.map((face) => (
        <motion.span
          key={face.key}
          initial={false}
          aria-hidden={!face.active || undefined}
          animate={
            face.active
              ? { opacity: 1, y: 0, filter: "blur(0px)" }
              : { opacity: 0, y: 3, filter: "blur(3px)" }
          }
          transition={fade}
          className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          {face.content}
        </motion.span>
      ))}
    </span>
  );
}
