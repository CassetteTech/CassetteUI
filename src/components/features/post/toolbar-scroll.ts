type Span = { top: number; bottom: number };

const unit = (value: number) => Math.min(1, Math.max(0, value));
const centre = ({ top, bottom }: Span) => (top + bottom) / 2;

export function titleUnder(lid: Span, title: { top: number; height: number }) {
  return unit((lid.bottom - title.top) / title.height);
}

export function statsSlideUnderLid(stats: { right: number }, lid: { right: number }, reducedMotion: boolean) {
  return !reducedMotion && stats.right <= lid.right;
}

export function trackStatsUnderLid({ lid, stats, cardBottom, slides, counts }: {
  lid: Span;
  stats: Span;
  cardBottom: number;
  slides: boolean;
  counts: boolean;
}) {
  const offset = centre(stats) - centre(lid);
  const listExit = Math.min(0, cardBottom - lid.bottom);
  return {
    statsShift: slides ? Math.max(0, offset) + listExit : listExit,
    statsVisible: !slides && offset > 0 ? 0 : 1,
    counterSwap: counts ? unit(-offset / 24) : 0,
    listExit,
  };
}

export function listProgress(lidBottom: number, listTop: number, listBottom: number) {
  return unit((lidBottom - listTop) / (listBottom - listTop));
}

export function trackCounterText(passed: number, total: number) {
  const digits = Math.max(2, String(total).length);
  return `Track ${String(Math.max(1, passed)).padStart(digits, '0')} of ${total}`;
}
