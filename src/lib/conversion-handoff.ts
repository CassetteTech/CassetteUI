import type { ConvertPartialResult, MusicLinkConversion } from '@/types';

/**
 * Hands a conversion to /post?url=, which shows the post building. The home URL
 * bar hands over a link for /post to convert; Add music hands over a conversion
 * it already started. Either records the auth scope it settled, so /post follows
 * the conversion as the same person, and where its bar or card sits on screen, so
 * the post can grow out of it. Module memory, not storage: it only has to survive
 * a client-side route change, and a reload of /post?url= simply converts as a
 * direct link.
 */
export interface ConversionHandoff {
  /** The link exactly as the home page read it; /post converts this. */
  url: string;
  /** Convert without the session (signed-out visitors), as the home page decided. */
  anonymous: boolean;
  /** The URL bar's viewport box when the conversion was handed over. */
  barRect: { left: number; top: number; width: number; height: number } | null;
  /**
   * A conversion already running: /post follows it instead of starting one, and shows
   * what Bridge already reported until its own first poll returns.
   */
  running?: {
    idempotencyKey: string;
    result: Promise<MusicLinkConversion>;
    reported: { stageLabel: string; partialResult: ConvertPartialResult | null };
  };
  handedOffAt: number;
}

/** Past this, the bar is long gone: convert as handed over, but do not grow out of it. */
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

/** The bar's box, while it is still fresh enough to grow out of. */
export function growthBox(handoff: ConversionHandoff | null): ConversionHandoff['barRect'] {
  return handoff && Date.now() - handoff.handedOffAt <= GROWTH_WINDOW_MS ? handoff.barRect : null;
}
