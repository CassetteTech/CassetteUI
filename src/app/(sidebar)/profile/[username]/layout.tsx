import type { Metadata } from 'next';
import { fetchProfileForMetadata } from '@/lib/server/fetch-profile';
import ProfileLayoutClient from './layout-client';

type Props = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  if (username === 'edit') {
    return {
      title: 'Edit Profile',
      robots: { index: false, follow: false },
    };
  }

  const profile = await fetchProfileForMetadata(username);
  if (!profile) {
    const title = 'Profile Not Found — Cassette Music';
    return {
      title: { absolute: title },
      description: 'This Cassette Music profile could not be found.',
      openGraph: { title },
      twitter: { title },
    };
  }

  const displayName = profile.displayName || profile.username;
  const title = `${displayName} (@${profile.username}) | Cassette Profile`;
  const description = profile.bio || `Explore ${displayName}'s music profile and MusicLinks on Cassette.`;
  const images = profile.avatarUrl ? [profile.avatarUrl] : [];

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

export default function ProfileLayout({ children }: Props) {
  return <ProfileLayoutClient>{children}</ProfileLayoutClient>;
}
