import { cn } from '@/lib/utils';
import { CuratorPhoneDemo } from './curator-phone-demo';
import { StartPageLink } from './home-brand';

const points = [
  { title: 'Set your price', body: 'Choose what fans pay each month, and add a yearly price if you like. Cassette handles the billing.' },
  { title: 'Keep some for members', body: 'Mark any post Members only. Everything else stays public, so new fans can find you.' },
  { title: 'Get paid monthly', body: 'Cassette sends your earnings to your bank every month.' },
];

export function CuratorMembershipSection({ isAuthenticated, className }: { isAuthenticated: boolean; className?: string }) {
  return (
    <section
      className={cn('mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16', className)}
      aria-labelledby="curator-membership-title"
    >
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary">For curators</p>
        <h2 id="curator-membership-title" className="mt-3 font-atkinson text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          Let fans pay for your best playlists.
        </h2>
        <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
          Curators are people who make playlists other people love. On Cassette, any curator can turn their free page into a membership. Fans join for a monthly price you set and open the posts you keep for members. Think Patreon, for playlists. You buy no plan.
        </p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3 lg:grid-cols-1 lg:gap-5">
          {points.map((point) => (
            <li key={point.title} className="lg:flex lg:gap-4">
              <span aria-hidden className="mb-2 block h-[2px] w-8 bg-primary lg:mb-0 lg:mt-2.5 lg:shrink-0" />
              <div>
                <h3 className="text-base font-semibold leading-tight text-foreground">{point.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{point.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <StartPageLink isAuthenticated={isAuthenticated} />
          <p className="mt-4 text-sm text-muted-foreground">Coming later: Curator Pro, optional extra tools for curators.</p>
        </div>
      </div>
      <figure>
        <CuratorPhoneDemo />
        <figcaption className="mt-3 text-center text-xs text-muted-foreground">Your page</figcaption>
      </figure>
    </section>
  );
}
