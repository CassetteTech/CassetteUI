// Shared motion constants — single source of truth for the app's easing curves.
// These mirror tailwind.config.js `transitionTimingFunction` (ease-out-quart /
// ease-in-quart); use these in framer-motion `ease` props instead of retyping
// the cubic-bezier arrays inline.
export const EASE_OUT_QUART: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_IN_QUART: [number, number, number, number] = [0.64, 0, 0.78, 0];
