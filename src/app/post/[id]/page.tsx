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
    return {
      title: 'Post Not Found - Cassette',
      description: 'This post could not be found on Cassette.',
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
    title: `${ogTitle} - Cassette`,
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: ogType,
      siteName: 'Cassette',
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
      title: ogTitle,
      description,
      images: artwork ? [artwork] : [],
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  return <PostClientPage postId={id} />;
}
