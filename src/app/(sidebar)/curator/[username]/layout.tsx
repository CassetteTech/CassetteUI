import type { Metadata } from 'next';
import { fetchCuratorPageForMetadata } from '@/lib/server/fetch-curator';

type Props = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const lookup = await fetchCuratorPageForMetadata(username);

  if (lookup.status === 'not_found') {
    return {
      title: { absolute: 'Curator Not Found — Cassette Music' },
      description: 'This Cassette Music curator page is not available.',
      robots: { index: false, follow: false },
    };
  }

  if (lookup.status === 'unavailable') {
    return {};
  }

  const curator = lookup.page.curator;
  const displayName = curator.displayName?.trim() || curator.username;
  const title = `${displayName} (@${curator.username}) | Cassette Curator`;
  const description = curator.headline || curator.bio || `Explore music curated by ${displayName} on Cassette.`;
  const images = curator.avatarUrl ? [curator.avatarUrl] : [];

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      siteName: 'Cassette Music',
      images,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images,
    },
  };
}

export default function CuratorLayout({ children }: Props) {
  return children;
}
