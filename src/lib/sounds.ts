import { defineSound } from '@web-kits/audio';

const likePop = defineSound({
  layers: [
    {
      source: { type: 'noise', color: 'white' },
      filter: { type: 'lowpass', frequency: 2400 },
      envelope: { decay: 0.02 },
      gain: 0.08,
    },
    {
      source: { type: 'sine', frequency: { start: 520, end: 210 } },
      envelope: { decay: 0.07 },
      gain: 0.22,
    },
  ],
});

const copyConfirm = defineSound({
  layers: [
    { source: { type: 'sine', frequency: 660 }, envelope: { decay: 0.07 }, gain: 0.16 },
    { source: { type: 'sine', frequency: 880 }, envelope: { decay: 0.1 }, gain: 0.16, delay: 0.07 },
  ],
});

const linkRecognized = defineSound({
  source: { type: 'sine', frequency: { start: 320, end: 720 } },
  envelope: { attack: 0.01, decay: 0.12 },
  gain: 0.2,
});

const errorTone = defineSound({
  source: { type: 'triangle', frequency: { start: 170, end: 120 } },
  filter: { type: 'lowpass', frequency: 420 },
  envelope: { decay: 0.14 },
  gain: 0.18,
});

// Audio must never break an interaction handler (blocked AudioContext, old browsers).
const safely = (play: () => unknown) => () => {
  try {
    play();
  } catch {
    // Audio unavailable; the visual feedback still happens.
  }
};

export const playLikePop = safely(likePop);
export const playCopyConfirm = safely(copyConfirm);
export const playLinkRecognized = safely(linkRecognized);
export const playErrorTone = safely(errorTone);
