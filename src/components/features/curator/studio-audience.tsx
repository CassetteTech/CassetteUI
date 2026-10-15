'use client';

import { useQuery } from '@tanstack/react-query';
import { StudioStat } from '@/components/features/curator/studio-shell';
import { Button } from '@/components/ui/button';
import { useAuthState } from '@/hooks/use-auth';
import { fetchCuratorAudience } from '@/services/curator';

const countFormatter = new Intl.NumberFormat('en-US');

export function StudioAudience({ onOpenMembers }: { onOpenMembers: () => void }) {
  const { user } = useAuthState();
  const audience = useQuery({
    queryKey: ['curator-audience', user?.id ?? null],
    queryFn: ({ signal }) => fetchCuratorAudience(signal),
    enabled: Boolean(user?.id),
    staleTime: 0,
  });
  const figure = (count: number | undefined, hint: string) => ({
    value: count === undefined ? '—' : countFormatter.format(count),
    hint: count !== undefined ? hint : audience.isError ? 'Unavailable right now' : 'Loading…',
  });
  return (
    <section aria-label="Audience" className="card-quiet p-4">
      <dl className="grid grid-cols-2 gap-4">
        <StudioStat label="Audience" {...figure(audience.data?.audienceCount, 'Followers and members')} />
        <StudioStat
          label="Members"
          {...figure(audience.data?.activeMemberCount, 'With access today')}
          onClick={onOpenMembers}
        />
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Each person counts once. Only you see these numbers.
      </p>
      {audience.isError && (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void audience.refetch()}>
          Try again
        </Button>
      )}
    </section>
  );
}
