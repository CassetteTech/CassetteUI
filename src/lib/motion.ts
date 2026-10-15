export const EASE_OUT_QUART: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_IN_QUART: [number, number, number, number] = [0.64, 0, 0.78, 0];

export const cubicBezier = (curve: readonly number[]) => `cubic-bezier(${curve.join(', ')})`;
