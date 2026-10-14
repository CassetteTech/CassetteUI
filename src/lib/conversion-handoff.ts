import type { ConvertPartialResult, MusicLinkConversion } from '@/types';

export interface ConversionHandoff {
  url: string;
  anonymous: boolean;
  barRect: { left: number; top: number; width: number; height: number } | null;
  running?: {
    idempotencyKey: string;
    result: Promise<MusicLinkConversion>;
    reported: { stageLabel: string | null; partialResult: ConvertPartialResult | null };
  };
  handedOffAt: number;
}

export const HANDOFF_BEAT_MS = 450;

const GROWTH_WINDOW_MS = 5000;

let pending: ConversionHandoff | null = null;

export function handOffConversion(handoff: Omit<ConversionHandoff, 'handedOffAt'>): void {
  pending = { ...handoff, handedOffAt: Date.now() };
}

/**
 * The handoff for this link, or null. `url` is the query value as the router
 * returns it (already decoded). Reading does not consume the handoff, so a
 * StrictMode double render reads the same value; /post clears it once used.
 */
export function readConversionHandoff(url: string): ConversionHandoff | null {
  return pending && pending.url === url ? pending : null;
}

export function clearConversionHandoff(handoff: ConversionHandoff): void {
  if (pending === handoff) pending = null;
}

export function growthBox(handoff: ConversionHandoff | null): ConversionHandoff['barRect'] {
  return handoff && Date.now() - handoff.handedOffAt <= GROWTH_WINDOW_MS ? handoff.barRect : null;
}
