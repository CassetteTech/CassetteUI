export const MIN_RUNWAY_CARDS = 75;
export const MAX_TILT_DEG = 45;
export const TILT_RAMP_PER_PITCH = 2.5;
export const DEPTH_PX_PER_PITCH = 300;
export const EDGE_FADE_START_PITCHES = 4;
export const EDGE_FADE_END_PITCHES = 8;
export const EASE_TIME_CONSTANT_MS = 60;
export const MAX_EASE_STEP_MS = 64;

export type CoverflowPose = { angle: number; depth: number; fade: number; z: number };

export function coverflowCopies(curatorCount: number) {
  if (curatorCount <= 1) return 1;
  const copies = Math.max(3, Math.ceil(MIN_RUNWAY_CARDS / curatorCount));
  return copies % 2 === 1 ? copies : copies + 1;
}

export function coverflowPose(pitchesFromCenter: number): CoverflowPose {
  const distance = Math.abs(pitchesFromCenter);
  return {
    angle: Math.sign(pitchesFromCenter) * Math.min(distance * TILT_RAMP_PER_PITCH, 1) * MAX_TILT_DEG,
    depth: -distance * DEPTH_PX_PER_PITCH,
    fade: Math.max(0, Math.min(1, (EDGE_FADE_END_PITCHES - distance) / (EDGE_FADE_END_PITCHES - EDGE_FADE_START_PITCHES))),
    z: 50 - Math.round(distance * 10),
  };
}

export const easeStep = (elapsedMs: number) =>
  1 - Math.exp(-Math.min(elapsedMs, MAX_EASE_STEP_MS) / EASE_TIME_CONSTANT_MS);
