import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { STREAMING_SERVICES } from './home-brand';

interface Step {
  title: string;
  body: string;
}

const curatorSteps: Step[] = [
  { title: 'Make your free page', body: 'Sign up with Google, then add songs, albums, and playlists from Spotify, Apple Music, or Deezer.' },
  { title: 'Set your price', body: 'Set up payouts, then choose what fans pay each month. You can add a yearly price too.' },
  { title: 'Post for members', body: 'Mark any post Members only. Fans who join can open it. Cassette bills them and pays you monthly.' },
];

const sharingSteps: Step[] = [
  { title: 'Paste a link', body: 'Copy a link to a song, album, playlist, or artist from Spotify, Apple Music, or Deezer.' },
  { title: 'Get your Cassette link', body: 'Cassette finds the same music on the other two apps.' },
  { title: 'Send it to anyone', body: 'Your friend taps the app they use, and the music opens there.' },
];

const [spotify, appleMusic, deezer] = STREAMING_SERVICES;

// Real links, so a tap runs a real conversion through the home page's /?url= path.
const examples = [
  { title: 'Midnight City', artist: 'M83', service: spotify, url: 'https://open.spotify.com/track/3jtvJtAA25a7d0BLOJ8Dqo' },
  { title: 'Time', artist: 'Pink Floyd', service: appleMusic, url: 'https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699?i=1065973705' },
  { title: 'Get Lucky', artist: 'Daft Punk', service: deezer, url: 'https://www.deezer.com/track/67238735' },
];

function StepList({ title, steps }: { title: string; steps: Step[] }) {
  return (
    <>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <ol className="mt-5 space-y-5">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span aria-hidden className="mt-0.5 font-mono text-xs font-bold tabular-nums text-primary">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="text-base font-semibold leading-tight text-foreground">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

/** The two ways to use Cassette, curators first, with live examples that
    open real Cassette pages. The hero's "See how it works" link lands here. */
export function HomeHowItWorks({ className }: { className?: string }) {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className={cn('mx-auto w-full max-w-6xl scroll-mt-24 px-5 sm:px-8', className)}>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">How it works</p>
      <h2 id="how-it-works-title" className="mt-3 max-w-2xl font-atkinson text-3xl font-bold leading-tight text-foreground sm:text-4xl">
        Share once. Fans listen on Spotify, Apple Music, or Deezer.
      </h2>
      <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <StepList title="If you make playlists" steps={curatorSteps} />
        </div>
        <div>
          <StepList title="If you just want to share music" steps={sharingSteps} />
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Got a playlist on the wrong app? Sign in and copy it into your own Spotify, Apple Music, or Deezer account.
          </p>
          <p className="mt-6 text-sm font-semibold text-foreground">Try one:</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {examples.map((example) => (
              <li key={example.url}>
                <Link
                  href={`/?url=${encodeURIComponent(example.url)}`}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50"
                >
                  <Image src={example.service.logo} alt={`${example.service.label} link:`} width={16} height={16} className="h-4 w-4 object-contain" />
                  <span className="font-semibold text-foreground">{example.title}</span>
                  <span className="text-muted-foreground">{example.artist}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
