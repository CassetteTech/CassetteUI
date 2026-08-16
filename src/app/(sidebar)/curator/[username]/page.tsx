import { notFound } from 'next/navigation';
import { PublicCuratorPage } from '@/components/features/curator/curator-page';
import { fetchCuratorPageForMetadata } from '@/lib/server/fetch-curator';

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const membershipFlows = ['join', 'return', 'canceled', 'portal-return'] as const;

export default async function CuratorPage({ params, searchParams }: Props) {
  const { username } = await params;
  const query = await searchParams;
  const lookup = await fetchCuratorPageForMetadata(username);

  if (lookup.status === 'not_found') {
    notFound();
  }

  const membership = membershipFlows.find((flow) => flow === query.membership) ?? null;
  const interval = query.interval === 'year' ? 'year' : 'month';

  return (
    <PublicCuratorPage
      username={username}
      membershipFlow={membership}
      initialInterval={interval}
    />
  );
}
