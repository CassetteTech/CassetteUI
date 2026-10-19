'use client';

import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type Ref, type RefObject } from 'react';
import Image, { getImageProps } from 'next/image';
import { useTheme } from 'next-themes';
import { AnimatePresence, MotionConfig, motion, useIsPresent, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { EASE_OUT_QUART } from '@/lib/motion';
import { useSheetViewportPin } from '@/hooks/use-sheet-viewport-pin';
import { cn } from '@/lib/utils';
import { useHomeSearch } from './use-home-search';
import { HomeSearchBar, HomeSearchResults } from './home-search-bar';
import { HomeBrand, STREAMING_SERVICES, StartPageLink } from './home-brand';
import { HomeHowItWorks } from './home-how-it-works';
import { CuratorMembershipSection } from './curator-membership-section';
import { HomeClosing } from './home-closing';
import { WindowDither } from './window-dither';

type Theme = 'light' | 'dark';
const other = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark');

type Layout = 'landscape' | 'portrait';
const WIDE = '(min-width: 1024px)';
const MEDIA = { landscape: '/videos/home-window', portrait: '/videos/home-window/portrait' } satisfies Record<Layout, string>;
const STILLS = {
  dark: { landscape: '/images/home-concepts/window-dark.jpg', portrait: '/images/home-concepts/window-dark-portrait.jpg' },
  light: { landscape: '/images/home-concepts/window-light.jpg', portrait: '/images/home-concepts/window-light-portrait.jpg' },
} satisfies Record<Theme, Record<Layout, string>>;
const subscribeToLayout = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const readLayout = (): Layout => (window.matchMedia(WIDE).matches ? 'landscape' : 'portrait');
const MOVE_RATE = 1.8;
const SETTLE_MS = 350;
// Phones crossfade the idle loops instead of playing a camera move.
const FADE_MS = 800;
// The dark idle loop does not end on its first frame, so two copies of it
// take turns: the next copy fades in on top shortly before the current one
// ends. Repeats skip the first second, which still looks like the still.
const BLEND_SECONDS = 1.2;
const REPEAT_FROM = 1;
// Media second at which the scene behind the copy column crosses the
// brightness where ink and paper copy have equal contrast (Y about 121 of
// 235), so the copy changes colour then. The move to light is the move to
// dark played backwards, less its opening hold on the window, where the
// rain would run upward.
const SWITCH_AT = { light: 2.52, dark: 1.95 } satisfies Record<Theme, number>;

const once = (target: EventTarget, event: string) =>
  new Promise((resolve) => target.addEventListener(event, resolve, { once: true }));

const until = (video: HTMLVideoElement, event: string) =>
  new Promise<void>((resolve, reject) => {
    const listening = new AbortController();
    video.addEventListener(event, () => { listening.abort(); resolve(); }, { signal: listening.signal });
    video.addEventListener('error', () => { listening.abort(); reject(video.error); }, { signal: listening.signal });
  });

async function seek(video: HTMLVideoElement, time: number) {
  if (video.error) throw video.error;
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) await until(video, 'loadedmetadata');
  if (Math.abs(video.currentTime - time) < 0.01 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
  video.currentTime = time;
  await until(video, 'seeked');
}

const painted = (video: HTMLVideoElement) => new Promise<void>((resolve) => video.requestVideoFrameCallback(() => resolve()));

async function startAt(video: HTMLVideoElement, time: number) {
  await seek(video, time);
  await video.play();
  await painted(video);
}

interface Idle {
  layer: HTMLElement;
  start: () => Promise<void>;
  stop: () => void;
  running: () => boolean;
}

// The dark idle loop: two copies of one clip take turns, so it has no seam.
function blendLoop(layer: HTMLElement, signal: AbortSignal): Idle {
  const copies = [...layer.querySelectorAll('video')];
  let current: HTMLVideoElement | null = null;
  let active = false;
  for (const copy of copies) {
    copy.addEventListener('timeupdate', () => {
      // Start the next copy early, so the current one never freezes on its last frame.
      if (!active || copy !== current || copy.duration - copy.currentTime > BLEND_SECONDS + 0.3) return;
      const next = copies.find((candidate) => candidate !== copy)!;
      current = next;
      startAt(next, REPEAT_FROM).then(() => {
        // Stopped or overtaken while starting: this copy must not keep playing.
        if (current !== next) return next.pause();
        next.style.zIndex = '1';
        copy.style.zIndex = '0';
        next.dataset.current = '';
        setTimeout(() => {
          if (current !== next) return;
          delete copy.dataset.current;
          copy.pause();
        }, BLEND_SECONDS * 1000);
      }, () => {});
    }, { signal });
  }
  return {
    layer,
    async start() {
      active = true;
      const [first, second] = copies;
      current = first;
      second.pause();
      await startAt(first, 0);
      if (current !== first) return first.pause();
      // The first copy appears at once; only the handovers between copies fade.
      for (const copy of copies) copy.style.transition = 'none';
      delete second.dataset.current;
      first.dataset.current = '';
      first.style.zIndex = '1';
      second.style.zIndex = '0';
      void first.offsetWidth;
      for (const copy of copies) copy.style.transition = '';
    },
    stop() {
      active = false;
      current = null;
      for (const copy of copies) copy.pause();
    },
    running: () => active,
  };
}

function createWindowScene(root: HTMLElement, onScene: (theme: Theme) => void, switchAt: Record<Theme, number> | null) {
  const abort = new AbortController();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pick = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const lightVideo = pick<HTMLVideoElement>('[data-idle="light"]');
  const idles = {
    dark: blendLoop(pick('[data-idle="dark"]'), abort.signal),
    light: { layer: lightVideo, start: () => startAt(lightVideo, 0), stop: () => lightVideo.pause(), running: () => !lightVideo.paused },
  } satisfies Record<Theme, Idle>;
  const moves = switchAt && { light: pick<HTMLVideoElement>('[data-move="light"]'), dark: pick<HTMLVideoElement>('[data-move="dark"]') };
  const layers = [...root.querySelectorAll<HTMLElement>('[data-layer]')];

  let target: Theme | undefined;
  let latest = 0;
  let atRest = false;
  let highestLayer = 0;
  const raise = (layer: HTMLElement) => { layer.style.zIndex = String(++highestLayer); };
  const setOpacity = (layer: HTMLElement, opacity: number) => {
    for (const animation of layer.getAnimations()) animation.cancel();
    layer.style.opacity = String(opacity);
  };
  const stopAll = () => {
    for (const idle of Object.values(idles)) idle.stop();
    for (const move of Object.values(moves ?? {})) move.pause();
  };
  let stills = false;
  const stillsOnly = (theme: Theme) => {
    stills = true;
    onScene(theme);
    for (const layer of layers) setOpacity(layer, 0);
    stopAll();
  };
  let disposed = false;
  const overtaken = () => {
    if (disposed || stills || reducedMotion.matches) return stopAll();
    if (!atRest || !target) return;
    for (const move of Object.values(moves ?? {})) move.pause();
    idles[other(target)].stop();
  };

  async function rest(theme: Theme, run: number) {
    const idle = idles[theme];
    if (!idle.running()) await idle.start();
    if (run !== latest) return overtaken();
    raise(idle.layer);
    setOpacity(idle.layer, 1);
    for (const layer of layers) if (layer !== idle.layer) setOpacity(layer, 0);
    for (const move of Object.values(moves ?? {})) move.pause();
    idles[other(theme)].stop();
    atRest = true;
  }

  async function playMove(theme: Theme, run: number) {
    const move = moves![theme];
    move.playbackRate = MOVE_RATE;
    await startAt(move, 0);
    if (run !== latest) return overtaken();
    raise(move);
    setOpacity(move, 1);
    idles[other(theme)].stop();
    // Checked on every painted frame: `timeupdate` fires only about four times a second.
    const onFrame: VideoFrameRequestCallback = (_now, frame) => {
      if (run !== latest) return;
      if (frame.mediaTime >= switchAt![theme]) return onScene(theme);
      move.requestVideoFrameCallback(onFrame);
    };
    move.requestVideoFrameCallback(onFrame);
    await once(move, 'ended');
    if (run !== latest) return;
    onScene(theme);
    await rest(theme, run);
  }

  // A crossfade to the theme's idle loop: quick when it retargets a change in
  // flight, and the whole theme change on phones, with the copy colours
  // flipping halfway through.
  async function settle(theme: Theme, run: number, duration = SETTLE_MS, flipAfter = 0) {
    if (!flipAfter) onScene(theme);
    const idle = idles[theme];
    if (!idle.running()) await idle.start();
    if (run !== latest) return overtaken();
    if (flipAfter) setTimeout(() => { if (run === latest) onScene(theme); }, flipAfter);
    const onTop = Number(idle.layer.style.zIndex) === highestLayer;
    const from = onTop ? Number(getComputedStyle(idle.layer).opacity) : 0;
    raise(idle.layer);
    // The fade runs over its end value, so no finished animation holds the layer:
    // Chromium can keep a cancelled `fill: 'forwards'` value after the inline style changes.
    idle.layer.style.opacity = '1';
    const fade = idle.layer.animate([{ opacity: from }, { opacity: 1 }], { duration: duration * (1 - from), easing: 'ease-out' });
    await fade.finished.catch(() => {});
    if (run !== latest) return;
    await rest(theme, run);
  }

  const resync = () => {
    const theme = target;
    if (!theme) return;
    const run = ++latest;
    atRest = false;
    stillsOnly(theme);
    if (reducedMotion.matches) return;
    stills = false;
    rest(theme, run).catch(() => { if (run === latest) stillsOnly(theme); });
  };
  reducedMotion.addEventListener('change', resync);

  return {
    show(theme: Theme) {
      if (theme === target) return;
      const first = target === undefined;
      target = theme;
      const run = ++latest;
      if (first || reducedMotion.matches) onScene(theme);
      if (reducedMotion.matches) return;
      const wasAtRest = atRest;
      atRest = false;
      stills = false;
      const step = first ? rest(theme, run)
        : !wasAtRest ? settle(theme, run)
        : moves ? playMove(theme, run)
        : settle(theme, run, FADE_MS, FADE_MS / 2);
      step.catch(() => { if (run === latest) stillsOnly(theme); });
    },
    dispose() {
      latest++;
      disposed = true;
      reducedMotion.removeEventListener('change', resync);
      abort.abort();
      stopAll();
    },
  };
}

const PLACEHOLDER = 'Paste a link, or search for music';
const SEARCH_MOVE = { duration: 0.38, ease: EASE_OUT_QUART };
const SEARCH_FADE = { duration: 0.2, ease: EASE_OUT_QUART };
const SHEET_SPRING = { type: 'spring', damping: 28, stiffness: 260 } as const;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The open sheet is modal: Tab stays inside it and Escape closes it.
function containSheetFocus(event: KeyboardEvent, root: HTMLElement, close: () => void) {
  if (event.key === 'Escape') return close();
  if (event.key !== 'Tab') return;
  const focusable = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first) return;
  const active = document.activeElement;
  if (!root.contains(active) || active === (event.shiftKey ? first : last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}
const BRAND_SCALE = 0.55;

function Departing({ ref, ...props }: HTMLMotionProps<'div'> & { ref?: Ref<HTMLDivElement> }) {
  const leaving = !useIsPresent();
  return <motion.div ref={ref} inert={leaving} aria-hidden={leaving || undefined} {...props} />;
}

const [spotify, appleMusic, deezer] = STREAMING_SERVICES;
const SERVICE_LINKS = [
  { service: spotify, link: 'open.spotify.com/…' },
  { service: appleMusic, link: 'music.apple.com/…' },
  { service: deezer, link: 'deezer.com/…' },
];
type CardState = { pasted: number; converted: number; next: 'pasted' | 'converted' };
const unshown = ({ pasted, converted }: CardState) =>
  SERVICE_LINKS.findIndex((_, index) => index !== pasted && index !== converted);
const nextCardState = (state: CardState): CardState => state.next === 'converted'
  ? { ...state, converted: unshown(state), next: 'pasted' }
  : { ...state, pasted: unshown(state), next: 'converted' };
const CARD_TURN_MS = 1725;
const CARD_LABEL = 'font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground';
const CARD_CHIP = 'flex h-7 items-center gap-2 rounded-md border px-2 font-mono text-xs';

const linkChip = (entry: { service: (typeof STREAMING_SERVICES)[number]; link: string }, className?: string) => (
  <span className={cn(CARD_CHIP, 'border-border bg-background text-muted-foreground', className)}>
    <Image src={entry.service.logo} alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0 object-contain" />
    <span className="truncate">{entry.link}</span>
  </span>
);

function TurningChip({ service, still, testId }: { service: number; still: number; testId: string }) {
  return (
    <>
      <span data-testid={`${testId}-turning`} className="relative h-7 overflow-hidden motion-reduce:hidden">
        <AnimatePresence initial={false}>
          <motion.span
            key={service}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE_OUT_QUART }}
            className="absolute inset-0"
          >
            {linkChip(SERVICE_LINKS[service])}
          </motion.span>
        </AnimatePresence>
      </span>
      <span data-testid={`${testId}-still`} className="hidden motion-reduce:block">{linkChip(SERVICE_LINKS[still])}</span>
    </>
  );
}

function LinkCard() {
  const [{ pasted, converted }, setCardState] = useState<CardState>({ pasted: 0, converted: 2, next: 'converted' });
  useEffect(() => {
    const timer = setInterval(() => setCardState(nextCardState), CARD_TURN_MS);
    return () => clearInterval(timer);
  }, []);
  return (
    <figure className="rounded-lg border border-border bg-card/90 p-3 text-card-foreground elev-soft">
      <figcaption className="sr-only">
        Paste a Spotify, Apple Music, or Deezer link. Cassette finds the same music on the other two, and gives you one link that opens in all three.
      </figcaption>
      <div aria-hidden className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        <span className={CARD_LABEL}>You paste</span>
        <TurningChip service={pasted} still={0} testId="link-card-pasted" />
        <span className={CARD_LABEL}>Converts to</span>
        <TurningChip service={converted} still={1} testId="link-card-converted" />
        <span className={CARD_LABEL}>You share</span>
        <span className={cn(CARD_CHIP, 'border-primary/40 bg-primary/10 font-semibold text-foreground')}>
          <Image src="/images/cassette_logo.svg" alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0 object-contain" />
          <span className="truncate">cassette.tech/post/…</span>
          <span className="ml-auto hidden shrink-0 gap-1 sm:flex">
            {STREAMING_SERVICES.map((service) => (
              <Image key={service.label} src={service.logo} alt="" width={14} height={14} className="h-3.5 w-3.5 object-contain" />
            ))}
          </span>
        </span>
      </div>
    </figure>
  );
}

// One still per theme; the browser fetches only the layout's picture.
function Still({ theme, className }: { theme: Theme; className: string }) {
  const picture = (layout: Layout) => getImageProps({ alt: '', src: STILLS[theme][layout], fill: true, sizes: '100vw', loading: 'eager', fetchPriority: 'high' }).props;
  const landscape = picture('landscape');
  return (
    <picture>
      <source media={WIDE} srcSet={landscape.srcSet} sizes={landscape.sizes} />
      <img data-still {...picture('portrait')} alt="" className={className} />
    </picture>
  );
}

function WindowScene({ theme, scene, onScene, copyRef }: {
  theme: Theme | undefined;
  scene: Theme | undefined;
  onScene: (theme: Theme) => void;
  copyRef: RefObject<HTMLElement | null>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const driver = useRef<ReturnType<typeof createWindowScene>>(null);
  const layout = useSyncExternalStore(subscribeToLayout, readLayout, () => undefined);
  const crop = 'object-cover object-center lg:object-right';
  const layerClass = `absolute inset-0 h-full w-full ${crop} opacity-0 motion-reduce:hidden`;

  useEffect(() => {
    if (!layout) return;
    driver.current = createWindowScene(rootRef.current!, onScene, layout === 'landscape' ? SWITCH_AT : null);
    return () => driver.current?.dispose();
  }, [onScene, layout]);

  useEffect(() => {
    if (theme) driver.current?.show(theme);
  }, [theme, layout]);

  const shown = (value: Theme) => scene
    ? scene === value ? 'opacity-100' : 'opacity-0'
    : value === 'dark' ? 'opacity-0 dark:opacity-100' : 'opacity-100 dark:opacity-0';

  // Below lg the scene box is a fixed share of the viewport (`--scene`), so
  // the copy keeps its place under the window sill on every screen height.
  return (
    <div ref={rootRef} aria-hidden className="absolute inset-x-0 top-0 h-[var(--scene)] overflow-hidden bg-background lg:bottom-0 lg:h-auto">
      <div className="absolute inset-0 isolate">
        <Still theme="dark" className={cn(crop, 'transition-opacity duration-500', shown('dark'))} />
        <Still theme="light" className={cn(crop, 'transition-opacity duration-500', shown('light'))} />
        {layout && (
          <Fragment key={layout}>
            <div data-layer data-idle="dark" className="absolute inset-0 isolate opacity-0 motion-reduce:hidden">
              {[0, 1].map((copy) => (
                <video key={copy} src={`${MEDIA[layout]}/idle-dark.mp4`} muted playsInline preload="auto" className={cn('absolute inset-0 h-full w-full opacity-0 transition-opacity duration-[1200ms] ease-linear data-[current]:opacity-100', crop)} />
              ))}
            </div>
            <video data-layer data-idle="light" src={`${MEDIA[layout]}/idle-light.mp4`} muted playsInline loop preload="auto" className={layerClass} />
            {layout === 'landscape' && (
              <>
                <video data-layer data-move="light" src={`${MEDIA.landscape}/move-to-light.mp4`} muted playsInline preload="auto" className={layerClass} />
                <video data-layer data-move="dark" src={`${MEDIA.landscape}/move-to-dark.mp4`} muted playsInline preload="auto" className={layerClass} />
              </>
            )}
          </Fragment>
        )}
      </div>
      <WindowDither key={layout} copyRef={copyRef} />
      {(['dark', 'light'] as const).map((value) => (
        <div
          key={value}
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-background via-background/50 to-transparent transition-opacity duration-400 lg:hidden',
            value === 'dark' ? 'dark' : 'force-light',
            shown(value),
          )}
        />
      ))}
    </div>
  );
}

export function HomeConceptWindow() {
  const search = useHomeSearch();
  const still = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' || resolvedTheme === 'light' ? resolvedTheme : undefined;
  const [scene, setScene] = useState<Theme>();
  const copyRef = useRef<HTMLDivElement>(null);
  const wide = useSyncExternalStore(subscribeToLayout, () => readLayout() === 'landscape', () => false);
  const rise = (order: number) => ({
    initial: still ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay: 0.25 + 0.07 * order, ease: EASE_OUT_QUART },
  });
  const expanded = wide && (search.isSearchActive || search.isConverting);
  // Phones: searching and converting take over the viewport in one fixed
  // sheet, so the same input stays mounted (the keyboard stays up) and the
  // bar glides between its hero and sheet positions as one element.
  const sheet = !wide && (search.isSearchActive || search.isConverting);
  const sheetRef = useSheetViewportPin(!wide && search.isSearchActive);
  const { close } = search;
  useEffect(() => {
    if (!sheet) return;
    const onKeyDown = (event: KeyboardEvent) => { if (sheetRef.current) containSheetFocus(event, sheetRef.current, close); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sheet, close, sheetRef]);
  const [hasOpened, setHasOpened] = useState(false);
  if (expanded && !hasOpened) setHasOpened(true);
  const { dismiss } = search;
  useEffect(() => dismiss(), [wide, dismiss]);
  const brandRef = useRef<HTMLDivElement>(null);
  const [brandHeight, setBrandHeight] = useState(0);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setBrandHeight(entry.contentRect.height));
    observer.observe(brandRef.current!);
    return () => observer.disconnect();
  }, []);
  const intro = (order: number) => ({
    initial: still ? false : hasOpened ? { opacity: 0, y: -8 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: hasOpened ? { ...SEARCH_FADE, duration: 0.25, delay: 0.12 + 0.03 * order } : rise(order).transition },
    exit: { opacity: 0, y: -8, transition: { ...SEARCH_FADE, delay: 0.03 * order } },
  });
  const brandMove = { ...SEARCH_MOVE, delay: expanded ? 0.03 : 0 };
  const barRise = rise(3);

  return (
    <div className="relative min-h-svh">
      {/* Below lg the portrait picture fills the width of a scene box 75% of
          the viewport tall and is cropped top and bottom. Its window sill sits
          57% down the picture, so the copy starts at 0.57 * (16 / 9) * 100vw
          less half the crop; on a screen narrow enough to fit the picture by
          height the sill is 57% of the box instead. */}
      {/* The section carries the scene's theme, so everything in the hero (its
          background under the scene box, the scrims, the paper edge, the copy)
          changes colour with the scene, not at the click. */}
      <section
        data-scene={scene}
        className={cn(
          'relative -mt-16 flex min-h-svh overflow-hidden bg-background transition-colors duration-400 [--wall:calc(100vw_-_0.424_*_max(100vw,_100svh_*_16_/_9))] [--scene:75svh] [--sill:max(0.57_*_var(--scene),_12.4vw_+_var(--scene)_/_2)]',
          scene === 'dark' && 'dark',
          scene === 'light' && 'force-light',
        )}
      >
        <WindowScene theme={theme} scene={scene} onScene={setScene} copyRef={copyRef} />
        <div className={cn('relative flex w-full text-foreground transition-colors duration-200', sheet ? 'z-[60]' : 'z-10')}>
          <div
            aria-hidden
            className={cn('pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_40%_55%_at_calc(var(--wall)_/_2)_52%,hsl(var(--background)/0.5),transparent)] transition-opacity duration-500 lg:block', scene === 'dark' ? 'opacity-100' : 'opacity-0')}
          />
          <MotionConfig reducedMotion="user">
            <div className={cn('relative mx-auto flex w-full max-w-7xl flex-col items-start justify-start px-5 pb-10 pt-[calc(var(--sill)_+_0.5rem)] sm:px-8 lg:mx-0 lg:w-[var(--wall)] lg:max-w-none lg:items-center lg:px-0 lg:pb-16 lg:pt-28', expanded ? 'lg:h-svh lg:justify-start' : 'lg:justify-center')}>
              <div ref={copyRef} className={cn('w-full max-w-[560px] lg:w-[min(520px,calc(100%_-_64px))]', expanded && 'pb-2')}>
                <motion.div
                  ref={brandRef}
                  layout="position"
                  data-testid="home-window-brand"
                  className="w-[64%] max-w-[440px] sm:w-[76%]"
                  style={{ originX: 0, originY: 0, marginBottom: expanded ? -(1 - BRAND_SCALE) * brandHeight : 0 }}
                  animate={{ scale: expanded ? BRAND_SCALE : 1 }}
                  transition={{ ...brandMove, layout: brandMove }}
                >
                  <HomeBrand />
                </motion.div>
                <AnimatePresence mode="popLayout">
                  {!expanded && [
                    <Departing key="headline" {...intro(0)} className="pt-6 lg:pt-8">
                      <h1 className="font-atkinson text-2xl font-bold leading-tight sm:text-4xl lg:text-3xl xl:text-4xl">
                        Get paid for your playlists.
                        <br />
                        Share music with anyone.
                      </h1>
                    </Departing>,
                    <Departing key="subline" {...intro(1)} className="pt-3">
                      <p className="text-base text-muted-foreground transition-colors duration-200">
                        Fans join your free Cassette page for a monthly price you set. Any music you share opens in Spotify, Apple Music, or Deezer.
                      </p>
                    </Departing>,
                    <Departing key="actions" {...intro(2)} className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-5 lg:pt-6">
                      <StartPageLink isAuthenticated={search.isAuthenticated} />
                      <a href="#how-it-works" className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50">
                        See how it works
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </Departing>,
                  ]}
                </AnimatePresence>
                <div
                  ref={sheetRef}
                  data-testid="home-search-sheet"
                  data-open={sheet || undefined}
                  role={sheet ? 'dialog' : undefined}
                  aria-modal={sheet || undefined}
                  aria-label={sheet ? 'Search music' : undefined}
                  className={cn(
                    // z-[60] clears the fixed navbar (z-50): the sheet is modal.
                    sheet ? 'fixed inset-0 z-[60] flex flex-col' : 'relative w-full pt-5 lg:z-10 lg:pt-6',
                    sheet && search.isConverting && 'justify-center px-6',
                  )}
                  style={{ overscrollBehavior: 'contain' }}
                >
                  <AnimatePresence>
                    {sheet && (
                      <motion.div
                        key="home-search-sheet-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="fixed inset-0 -z-10 bg-background"
                      />
                    )}
                  </AnimatePresence>
                  {/* The glide lives on its own element: a layout animation and an
                      animated transform on one node fight over the transform. */}
                  <motion.div
                    layout="position"
                    transition={{ layout: wide ? { ...SEARCH_MOVE, delay: expanded ? 0.06 : 0 } : SHEET_SPRING }}
                    className={cn('w-full', sheet && !search.isConverting && 'px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2')}
                  >
                    <motion.div {...barRise} data-testid="home-search-entrance">
                      <HomeSearchBar search={search} closeOnBlur={wide} size="sm" placeholder={PLACEHOLDER} />
                    </motion.div>
                  </motion.div>
                  {sheet && !search.isConverting && (
                    <motion.div
                      key="home-search-sheet-results"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      // The list arrives once the bar has nearly reached the top.
                      transition={{ ...SHEET_SPRING, delay: 0.28 }}
                      className="min-h-0 flex-1 overflow-y-auto px-5 pb-4"
                      style={{ overscrollBehavior: 'contain' }}
                      // A tap on the empty area under the list closes the sheet, like a scrim.
                      role="presentation"
                      onPointerDown={(event) => { if (event.target === event.currentTarget) search.close(); }}
                    >
                      <HomeSearchResults search={search} chrome="flat" />
                    </motion.div>
                  )}
                </div>
                <AnimatePresence mode="popLayout">
                  {!expanded && (
                    <Departing key="link-card" {...intro(4)} className="hidden pt-3 [@media(min-width:1024px)_and_(min-height:761px)]:block">
                      <LinkCard />
                    </Departing>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence mode="popLayout">
                {wide && search.isSearchActive && !search.isConverting && (
                  <motion.div
                    key="home-window-results"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { ...SEARCH_FADE, delay: 0.24 } }}
                    exit={{ opacity: 0, transition: { ...SEARCH_FADE, duration: 0.15 } }}
                    onMouseDown={(event) => event.preventDefault()}
                    className="force-light min-h-0 w-[min(520px,calc(100%_-_64px))] overflow-y-auto overscroll-contain rounded-lg border border-border bg-field"
                  >
                    <HomeSearchResults search={search} chrome="bare" className="sm:mb-0 sm:px-0 md:px-0" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </MotionConfig>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-[5]">
          <DitherEdge color="hsl(var(--background))" />
        </div>
      </section>

      <HomeHowItWorks className="relative z-10 mt-16" />

      <CuratorMembershipSection isAuthenticated={search.isAuthenticated} className="relative z-10 mt-24" />

      <HomeClosing isAuthenticated={search.isAuthenticated} className="mt-20" />
    </div>
  );
}
