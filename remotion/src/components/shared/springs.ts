// Shared spring configurations for consistent animations
// High damping = smooth, professional movement (not bouncy)

export const springConfigs = {
  // UI elements - snappy, responsive
  snappy: {
    damping: 200,
    stiffness: 300,
    mass: 0.5,
  },

  // Entrances - smooth, elegant
  smooth: {
    damping: 200,
    stiffness: 80,
    mass: 1,
  },

  // Subtle movements - gentle, natural
  gentle: {
    damping: 200,
    stiffness: 40,
    mass: 1.2,
  },

  // Stagger delays (in frames)
  stagger: {
    fast: 4,
    normal: 6,
    slow: 8,
  },
} as const;

export type SpringConfig = typeof springConfigs.snappy;
