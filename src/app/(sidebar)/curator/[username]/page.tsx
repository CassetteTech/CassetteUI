import { notFound } from 'next/navigation';
import { PublicCuratorPage } from '@/components/features/curator/curator-page';
import { fetchCuratorPageForMetadata } from '@/lib/server/fetch-curator';

type Props = {
  params: Promise<{ username: string }>;
};

export default async function CuratorPage({ params }: Props) {
  const { username } = await params;
  const lookup = await fetchCuratorPageForMetadata(username);

  if (lookup.status === 'not_found') {
    notFound();
  }

  return <PublicCuratorPage username={username} />;
}
