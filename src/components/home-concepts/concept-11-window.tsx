'use client';

import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type Ref, type RefObject } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { AnimatePresence, MotionConfig, motion, useIsPresent, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { EASE_OUT_QUART } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useHomeSearch } from './use-home-search';
import { HomeSearchBar, HomeSearchDropdown, HomeSearchResults } from './home-search-bar';
import { HomeBrand, STREAMING_SERVICES, StartPageLink } from './home-brand';
import { HomeHowItWorks } from './home-how-it-works';
import { CuratorMembershipSection } from './curator-membership-section';
import { HomeClosing } from './home-closing';
import { WindowDither } from './window-dither';

type Theme = 'light' | 'dark';
const other = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark');

// Wide screens (Tailwind `lg`) get the landscape media; phones and portrait
// tablets get the portrait set, framed for copy at the bottom.
type Layout = 'landscape' | 'portrait';
const WIDE = '(min-width: 1024px)';
const MEDIA = { landscape: '/videos/home-window', portrait: '/videos/home-window/portrait' } satisfies Record<Layout, string>;
const subscribeToLayout = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const readLayout = (): Layout => (window.matchMedia(WIDE).matches ? 'landscape' : 'portrait');
// Camera moves play faster than they were rendered.
const MOVE_RATE = 1.8;
// A theme change during a move fades to the new idle loop this fast.
const SETTLE_MS = 350;
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
// The portrait moves push into the glass and pull back out on the other
// side, joined on out-of-focus glass, so the camera never turns in the room.
// Phones measure the headline band, which sits higher than the desktop column.
const SWITCH_AT = {
  landscape: { light: 2.52, dark: 1.95 },
  portrait: { light: 5.46, dark: 1.21 },
} satisfies Record<Layout, Record<Theme, number>>;

const once = (target: EventTarget, event: string) =>
  new Promise((resolve) => target.addEventListener(event, resolve, { once: true }));

// Waits for a media event; a clip that fails to load or decode rejects, so
// the scene falls back to its stills.
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

// Resolves once a playing video has painted a frame, so revealing it never shows a stale frame.
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

/**
 * Drives the window scene from the theme. The first theme shows its idle
 * loop with no move. Later, a change at rest plays the camera move and
 * hands over to the new idle loop with a hard cut (the move ends on the
 * loop's first frame); a change during a move goes straight to the new
 * idle loop with a short crossfade. Every change gets a run number, and an
 * async step from an older run stops as soon as it sees a newer one, so
 * rapid changes never leave stale state. `onScene` reports when the copy
 * should change colour. Under reduced motion only the stills show.
 */
function createWindowScene(root: HTMLElement, onScene: (theme: Theme) => void, switchAt: Record<Theme, number>) {
  const abort = new AbortController();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pick = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const lightVideo = pick<HTMLVideoElement>('[data-idle="light"]');
  const idles = {
    dark: blendLoop(pick('[data-idle="dark"]'), abort.signal),
    light: { layer: lightVideo, start: () => startAt(lightVideo, 0), stop: () => lightVideo.pause(), running: () => !lightVideo.paused },
  } satisfies Record<Theme, Idle>;
  const moves = { light: pick<HTMLVideoElement>('[data-move="light"]'), dark: pick<HTMLVideoElement>('[data-move="dark"]') } satisfies Record<Theme, HTMLVideoElement>;
  const layers = [...root.querySelectorAll<HTMLElement>('[data-layer]')];

  let target: Theme | undefined;
  let latest = 0;
  let atRest = false;
  // The most recently raised layer is on top.
  let highestLayer = 0;
  const raise = (layer: HTMLElement) => { layer.style.zIndex = String(++highestLayer); };
  const setOpacity = (layer: HTMLElement, opacity: number) => {
    for (const animation of layer.getAnimations()) animation.cancel();
    layer.style.opacity = String(opacity);
  };
  const stopAll = () => {
    for (const idle of Object.values(idles)) idle.stop();
    for (const move of Object.values(moves)) move.pause();
  };
  // Shows only the stills, which follow the copy, until the next change.
  let stills = false;
  const stillsOnly = (theme: Theme) => {
    stills = true;
    onScene(theme);
    for (const layer of layers) setOpacity(layer, 0);
    stopAll();
  };
  let disposed = false;
  // A step that a newer run overtook can finish starting a clip after that
  // run has settled. Put playback back to what the current state needs;
  // a newer run still in progress settles playback itself when it rests.
  const overtaken = () => {
    if (disposed || stills || reducedMotion.matches) return stopAll();
    if (!atRest || !target) return;
    for (const move of Object.values(moves)) move.pause();
    idles[other(target)].stop();
  };

  // Shows a theme's idle loop on top, once its first frame is ready, and stops everything else.
  async function rest(theme: Theme, run: number) {
    const idle = idles[theme];
    if (!idle.running()) await idle.start();
    if (run !== latest) return overtaken();
    raise(idle.layer);
    setOpacity(idle.layer, 1);
    for (const layer of layers) if (layer !== idle.layer) setOpacity(layer, 0);
    for (const move of Object.values(moves)) move.pause();
    idles[other(theme)].stop();
    atRest = true;
  }

  async function playMove(theme: Theme, run: number) {
    const move = moves[theme];
    move.playbackRate = MOVE_RATE;
    await startAt(move, 0);
    if (run !== latest) return overtaken();
    raise(move);
    setOpacity(move, 1);
    idles[other(theme)].stop();
    // Checked on every painted frame: `timeupdate` fires only about four times a second.
    const onFrame: VideoFrameRequestCallback = (_now, frame) => {
      if (run !== latest) return;
      if (frame.mediaTime >= switchAt[theme]) return onScene(theme);
      move.requestVideoFrameCallback(onFrame);
    };
    move.requestVideoFrameCallback(onFrame);
    await once(move, 'ended');
    if (run !== latest) return;
    onScene(theme);
    await rest(theme, run);
  }

  async function settle(theme: Theme, run: number) {
    onScene(theme);
    const idle = idles[theme];
    if (!idle.running()) await idle.start();
    if (run !== latest) return overtaken();
    // A loop already on top fades on from where it is, so it does not blink;
    // one under a camera move fades in from nothing, so the change is a crossfade.
    const onTop = Number(idle.layer.style.zIndex) === highestLayer;
    const from = onTop ? Number(getComputedStyle(idle.layer).opacity) : 0;
    raise(idle.layer);
    // The fade runs over its end value, so no finished animation holds the layer:
    // Chromium can keep a cancelled `fill: 'forwards'` value after the inline style changes.
    idle.layer.style.opacity = '1';
    const fade = idle.layer.animate([{ opacity: from }, { opacity: 1 }], { duration: SETTLE_MS * (1 - from), easing: 'ease-out' });
    await fade.finished.catch(() => {});
    if (run !== latest) return;
    await rest(theme, run);
  }

  // Reduced motion switched on or off mid-session: stills only, or the
  // target's idle loop with no move.
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
      const step = first ? rest(theme, run) : wasAtRest ? playMove(theme, run) : settle(theme, run);
      // A video that cannot load or play leaves the stills.
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

// Wide screens keep the right of the landscape frame; the portrait frame is centred.

const PLACEHOLDER = 'Paste a link, or search for music';
// The open search: fades run shorter than moves, so the pitch is gone
// before the bar passes over its place.
const SEARCH_MOVE = { duration: 0.38, ease: EASE_OUT_QUART };
const SEARCH_FADE = { duration: 0.2, ease: EASE_OUT_QUART };
const BRAND_SCALE = 0.55;

/** Hero copy that leaves while the search is open: inert and hidden from
    assistive technology from the moment it starts to fade. It carries no
    margin, since the fade holds it in place at its offset. */
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
// Each pasted link converts to its match on every other service in turn;
// then the pasted link turns to the next service. Each step moves one row.
const TARGETS_PER_SOURCE = SERVICE_LINKS.length - 1;
const CARD_STEPS = SERVICE_LINKS.length * TARGETS_PER_SOURCE;
const CARD_TURN_MS = 1500;
const CARD_LABEL = 'font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground';
const CARD_CHIP = 'flex h-7 items-center gap-2 rounded-md border px-2 font-mono text-xs';

const linkChip = (entry: { service: (typeof STREAMING_SERVICES)[number]; link: string }, className?: string) => (
  <span className={cn(CARD_CHIP, 'border-border bg-background text-muted-foreground', className)}>
    <Image src={entry.service.logo} alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0 object-contain" />
    <span className="truncate">{entry.link}</span>
  </span>
);

/** A link chip that turns to each new service. Under reduced motion, CSS
    swaps it for a still chip, so a change mid-session applies at once. */
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

/** What the bar does, as input and output: a link from any of the three
    services converts to the same music on the other two, and one Cassette
    link opens in all three. An illustration, not a post. */
function LinkCard() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((value) => (value + 1) % CARD_STEPS), CARD_TURN_MS);
    return () => clearInterval(timer);
  }, []);
  const source = Math.floor(step / TARGETS_PER_SOURCE);
  const target = (source + 1 + (step % TARGETS_PER_SOURCE)) % SERVICE_LINKS.length;
  return (
    <figure className="rounded-lg border border-border bg-card/90 p-3 text-card-foreground elev-soft">
      <figcaption className="sr-only">
        Paste a Spotify, Apple Music, or Deezer link. Cassette finds the same music on the other two, and gives you one link that opens in all three.
      </figcaption>
      <div aria-hidden className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        <span className={CARD_LABEL}>You paste</span>
        <TurningChip service={source} still={0} testId="link-card-pasted" />
        <span className={CARD_LABEL}>Converts to</span>
        <TurningChip service={target} still={1} testId="link-card-converted" />
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

/** The window backdrop: stills at the bottom that follow the scene, and
    the video layers above them, shown and hidden by the scene driver.
    Every layer shares one crop, so a cut between matching frames is
    invisible. The dither prints over the whole stack. */
function WindowScene({ theme, scene, onScene, copyRef, phonePan }: {
  theme: Theme | undefined;
  scene: Theme | undefined;
  onScene: (theme: Theme) => void;
  copyRef: RefObject<HTMLElement | null>;
  // REVIEW ONLY: phones play the desktop set cropped to the window (pan) or the portrait set.
  phonePan: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const driver = useRef<ReturnType<typeof createWindowScene>>(null);
  // Known only in the browser; until then the stills show. A layout change
  // swaps the videos for fresh ones and restarts the scene with no move.
  const screen = useSyncExternalStore(subscribeToLayout, readLayout, () => undefined);
  const layout = screen === 'portrait' && phonePan ? 'landscape' : screen;
  // Pan mode: each theme has its own crop on phones, following the page's
  // dark class, which changes at the click, so the crop pans with the move.
  const crop = phonePan
    ? 'object-cover object-right dark:object-[85%_50%] lg:object-right lg:dark:object-right'
    : 'object-cover object-center lg:object-right';
  const pan = phonePan ? 'object-position 3.5s ease-in-out' : '';
  const layerClass = `absolute inset-0 h-full w-full ${crop} opacity-0 motion-reduce:hidden`;
  const layerTransition = pan ? { transition: pan } : undefined;

  useEffect(() => {
    if (!layout) return;
    driver.current = createWindowScene(rootRef.current!, onScene, SWITCH_AT[layout]);
    return () => driver.current?.dispose();
  }, [onScene, layout]);

  useEffect(() => {
    if (theme) driver.current?.show(theme);
  }, [theme, layout]);

  // Before the scene is known, the stills follow the page theme.
  const still = (value: Theme, portrait: boolean) =>
    cn(crop, phonePan ? '[transition:opacity_0.5s,object-position_3.5s_ease-in-out]' : 'transition-opacity duration-500', portrait ? (phonePan ? 'hidden' : 'lg:hidden') : (phonePan ? '' : 'hidden lg:block'), scene
      ? scene === value ? 'opacity-100' : 'opacity-0'
      : value === 'dark' ? 'opacity-0 dark:opacity-100' : 'opacity-100 dark:opacity-0');

  return (
    <div ref={rootRef} aria-hidden className="absolute inset-0 overflow-hidden bg-background">
      {/* Isolated, so raised layers stay under the dither canvas. */}
      <div className="absolute inset-0 isolate">
        <Image data-still src="/images/home-concepts/window-dark.jpg" alt="" fill sizes="100vw" priority className={still('dark', false)} />
        <Image data-still src="/images/home-concepts/window-light.jpg" alt="" fill sizes="100vw" priority className={still('light', false)} />
        <Image data-still src="/images/home-concepts/window-dark-portrait.jpg" alt="" fill sizes="100vw" priority className={still('dark', true)} />
        <Image data-still src="/images/home-concepts/window-light-portrait.jpg" alt="" fill sizes="100vw" priority className={still('light', true)} />
        {layout && (
          <Fragment key={layout}>
            <div data-layer data-idle="dark" className="absolute inset-0 isolate opacity-0 motion-reduce:hidden">
              {[0, 1].map((copy) => (
                <video key={copy} src={`${MEDIA[layout]}/idle-dark.mp4`} muted playsInline preload="auto" className={cn('absolute inset-0 h-full w-full opacity-0 data-[current]:opacity-100', crop, phonePan ? '[transition:opacity_1.2s_linear,object-position_3.5s_ease-in-out]' : 'transition-opacity duration-[1200ms] ease-linear')} />
              ))}
            </div>
            <video data-layer data-idle="light" src={`${MEDIA[layout]}/idle-light.mp4`} muted playsInline loop preload="auto" className={layerClass} style={layerTransition} />
            <video data-layer data-move="light" src={`${MEDIA[layout]}/move-to-light.mp4`} muted playsInline preload="auto" className={layerClass} style={layerTransition} />
            <video data-layer data-move="dark" src={`${MEDIA[layout]}/move-to-dark.mp4`} muted playsInline preload="auto" className={layerClass} style={layerTransition} />
          </Fragment>
        )}
      </div>
      <WindowDither key={layout} copyRef={copyRef} />
    </div>
  );
}

/** The home page: the window scene as the hero backdrop, then how Cassette
    works, the curator membership pitch, and the sign-up ask. Dark is inside
    the room looking out at a rainy dusk; light is outside looking in. A theme
    change from any control plays the camera move between them, and the copy
    changes colour when the new scene reaches it. */
export function HomeConceptWindow() {
  const search = useHomeSearch();
  const still = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' || resolvedTheme === 'light' ? resolvedTheme : undefined;
  const [scene, setScene] = useState<Theme>();
  const copyRef = useRef<HTMLDivElement>(null);
  const phonePan = useSearchParams().get('phone') !== 'portrait';
  const wide = useSyncExternalStore(subscribeToLayout, () => readLayout() === 'landscape', () => false);
  const rise = (order: number) => ({
    initial: still ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay: 0.25 + 0.07 * order, ease: EASE_OUT_QUART },
  });
  // Wide screens open the search in place: the pitch fades, and the wordmark
  // and bar move up to make room for the results. A conversion keeps the
  // layout it started in until the post opens.
  const expanded = wide && (search.isSearchActive || search.isConverting);
  const [hasOpened, setHasOpened] = useState(false);
  if (expanded && !hasOpened) setHasOpened(true);
  // Crossing `lg` swaps the search field and drops its focus, so the results close with it.
  const { dismiss } = search;
  useEffect(() => dismiss(), [wide, dismiss]);
  const brandRef = useRef<HTMLDivElement>(null);
  const [brandHeight, setBrandHeight] = useState(0);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setBrandHeight(entry.contentRect.height));
    observer.observe(brandRef.current!);
    return () => observer.disconnect();
  }, []);
  // The pitch rises in on load; after the search closes it settles back from
  // where it left, once the bar has started down.
  const intro = (order: number) => ({
    initial: still ? false : hasOpened ? { opacity: 0, y: -8 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: hasOpened ? { ...SEARCH_FADE, duration: 0.25, delay: 0.12 + 0.03 * order } : rise(order).transition },
    exit: { opacity: 0, y: -8, transition: { ...SEARCH_FADE, delay: 0.03 * order } },
  });
  const brandMove = { ...SEARCH_MOVE, delay: expanded ? 0.03 : 0 };
  const barRise = rise(3);

  return (
    <div className="relative min-h-svh">
      {/* --wall: on wide screens, the plain wall left of the window. The scene
          covers the hero anchored right, and the window frame starts at 57.6%
          of its width, so the free wall is the viewport less 42.4% of the
          scene's width. The copy centres in it, clear of the frame. */}
      <section data-scene={scene} className="relative -mt-16 flex min-h-svh overflow-hidden [--wall:calc(100vw_-_0.424_*_max(100vw,_100svh_*_16_/_9))]">
        <WindowScene theme={theme} scene={scene} onScene={setScene} copyRef={copyRef} phonePan={phonePan} />
        {/* The copy keeps the scene's theme, not the page's, until the camera reaches it. */}
        <div className={cn('relative z-10 flex w-full text-foreground transition-colors duration-200', scene === 'dark' && 'dark', scene === 'light' && 'force-light')}>
          {/* Phones: the copy sits on the lower half of the portrait scene, so
              the scene's own paper or ink rises softly behind it, more on short
              phones, where the copy covers more of the scene. One layer per
              theme, crossfading with the copy colour, so they change together. */}
          {!phonePan && (['dark', 'light'] as const).map((value) => (
            <div
              key={value}
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-0 transition-opacity duration-200 lg:hidden',
                phonePan
                  ? 'top-0 h-[60%] bg-gradient-to-b from-background from-45% via-background/80 to-transparent [@media(max-height:720px)]:h-[75%]'
                  : 'bottom-0 bg-gradient-to-t h-[55%] from-background/70 via-background/30 to-transparent [@media(max-height:720px)]:h-[75%] [@media(max-height:720px)]:from-background/85',
                value === 'dark' ? 'dark' : 'force-light',
                // Before the scene is known (and during hydration), follow the page theme.
                scene ? scene === value ? 'opacity-100' : 'opacity-0' : value === 'dark' ? 'opacity-0 dark:opacity-100' : 'opacity-100 dark:opacity-0',
              )}
            />
          ))}
          {/* Dark scene only: a soft shade behind the copy column. */}
          <div
            aria-hidden
            className={cn('pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_40%_55%_at_calc(var(--wall)_/_2)_52%,hsl(var(--background)/0.5),transparent)] transition-opacity duration-500 lg:block', scene === 'dark' ? 'opacity-100' : 'opacity-0')}
          />
          {/* Reduced motion: the open search swaps layouts with fades only. */}
          <MotionConfig reducedMotion="user">
            <div className={cn('relative mx-auto flex w-full max-w-7xl flex-col items-start px-5 pb-12 sm:px-8 lg:mx-0 lg:w-[var(--wall)] lg:max-w-none lg:items-center lg:px-0 lg:pb-16 lg:pt-28', expanded ? 'lg:h-svh lg:justify-start' : 'lg:justify-center', phonePan ? 'justify-start pt-20' : 'justify-end pt-28')}>
              <div ref={copyRef} className={cn('w-full max-w-[560px] lg:w-[min(520px,calc(100%_-_64px))]', expanded && 'pb-2')}>
                {/* The open search keeps the wordmark, shrunk to the top of the
                    column; its negative margin gives back the height it loses. */}
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
                {/* The open search fades the pitch in place; the bar moves up over its place.
                    Curators come first: the headline and the call to action speak to
                    them; the bar and the card under it serve people sharing music. */}
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
                {/* Phones: the results drop over the card under the bar. Wide
                    screens: the card leaves and the results fill the column below. */}
                <motion.div {...barRise} layout="position" transition={{ ...barRise.transition, layout: { ...SEARCH_MOVE, delay: expanded ? 0.06 : 0 } }} className="w-full pt-5 lg:relative lg:z-10 lg:pt-6">
                  {wide
                    ? <HomeSearchBar search={search} closeOnBlur size="sm" placeholder={PLACEHOLDER} />
                    : <HomeSearchDropdown search={search} size="sm" placeholder={PLACEHOLDER} />}
                </motion.div>
                {/* Short screens skip the card, so the bar stays above the fold. */}
                <AnimatePresence mode="popLayout">
                  {!expanded && (
                    <Departing key="link-card" {...intro(4)} className="pt-3 [@media(max-height:760px)]:hidden">
                      <LinkCard />
                    </Departing>
                  )}
                </AnimatePresence>
              </div>
              {/* Wide screens: the results fill the column under the bar and scroll
                  inside it, opening once the bar has nearly arrived. Pressing in
                  the panel keeps focus in the bar. The gap above it is the copy's
                  padding, since a margin would shift it as it fades out. */}
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
        {/* The page paper dissolves up into the scene at the hero's foot. */}
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
