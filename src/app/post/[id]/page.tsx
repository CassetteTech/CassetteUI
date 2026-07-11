import { Metadata } from 'next';
import { fetchPostForMetadata, generateOgTitle, generateOgDescription, extractArtworkUrl } from '@/lib/server/fetch-post';
import PostClientPage from './post-client';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await fetchPostForMetadata(id);

  if (!post) {
    const title = 'MusicLink Not Found — Cassette Music';
    return {
      title: { absolute: title },
      description: 'This MusicLink could not be found on Cassette Music.',
      openGraph: { title },
      twitter: { title },
    };
  }

  const ogTitle = generateOgTitle(post);
  const description = generateOgDescription(post);
  const artwork = extractArtworkUrl(post);

  // Determine og:type based on element type
  const elementType = post.elementType?.toLowerCase();
  let ogType: 'music.song' | 'music.album' | 'music.playlist' | 'profile' | 'website' = 'website';
  if (elementType === 'track') ogType = 'music.song';
  else if (elementType === 'album') ogType = 'music.album';
  else if (elementType === 'playlist') ogType = 'music.playlist';
  else if (elementType === 'artist') ogType = 'profile';

  return {
    title: { absolute: `${ogTitle} | Cassette MusicLink` },
    description,
    openGraph: {
      title: `${ogTitle} | Cassette MusicLink`,
      description,
      type: ogType,
      siteName: 'Cassette Music',
      images: artwork
        ? [
            {
              url: artwork,
              width: 300,
              height: 300,
              alt: ogTitle,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${ogTitle} | Cassette MusicLink`,
      description,
      images: artwork ? [artwork] : [],
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  // Shares the generateMetadata fetch via cache() — no extra Bridge call.
  // Null (miss/timeout) just means the client falls back to fetching itself.
  const initialPost = await fetchPostForMetadata(id);
  return <PostClientPage postId={id} initialPost={initialPost} />;
}
