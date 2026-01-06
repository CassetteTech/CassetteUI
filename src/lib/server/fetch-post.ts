import { PostByIdResponse } from '@/types';
import { getApiUrl } from '@/lib/utils/url';

/**
 * Server-side fetch utility for post data.
 * Used by generateMetadata to fetch post info without client-side dependencies.
 */
export async function fetchPostForMetadata(postId: string): Promise<PostByIdResponse | null> {
  const apiUrl = getApiUrl();

  try {
    const response = await fetch(`${apiUrl}/api/v1/social/posts/${postId}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      console.error(`Failed to fetch post ${postId}: ${response.status}`);
      return null;
    }

    const data: PostByIdResponse = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching post ${postId}:`, error);
    return null;
  }
}

/**
 * Extract artwork URL from post data with fallbacks.
 * Checks details.coverArtUrl, details.imageUrl, top-level imageUrl, and platforms[*].artworkUrl
 */
export function extractArtworkUrl(post: PostByIdResponse): string {
  // Primary sources
  if (post.details?.coverArtUrl) {
    return post.details.coverArtUrl;
  }
  if (post.details?.imageUrl) {
    return post.details.imageUrl;
  }

  // Check top-level imageUrl (some responses have it there)
  const topLevelImageUrl = (post as unknown as { imageUrl?: string }).imageUrl;
  if (topLevelImageUrl) {
    return topLevelImageUrl;
  }

  // Fallback: check platforms for artworkUrl
  if (post.platforms) {
    for (const platformData of Object.values(post.platforms)) {
      if (platformData?.artworkUrl) {
        return platformData.artworkUrl;
      }
    }
  }

  return '';
}

/**
 * Extract title from post data with fallbacks.
 * Checks details.title, details.name, and top-level name
 */
export function extractTitle(post: PostByIdResponse): string {
  if (post.details?.title) {
    return post.details.title;
  }
  if (post.details?.name) {
    return post.details.name;
  }

  // Check top-level name (some responses have it there)
  const topLevelName = (post as unknown as { name?: string }).name;
  if (topLevelName) {
    return topLevelName;
  }

  return 'Unknown';
}

/**
 * Generate Open Graph title based on element type.
 * - Tracks/Albums: "Title - Artist Name"
 * - Artists: Just the artist name
 * - Playlists: "Playlist Name - Username" or "Playlist Name - Cassette" if no user
 */
export function generateOgTitle(post: PostByIdResponse): string {
  const elementType = post.elementType?.toLowerCase();
  const title = extractTitle(post);
  const artist = post.details?.artist || '';
  const username = post.username;

  switch (elementType) {
    case 'track':
    case 'album':
      return artist ? `${title} - ${artist}` : title;
    case 'artist':
      return title;
    case 'playlist':
      return username ? `${title} - ${username}` : `${title} - Cassette`;
    default:
      return title;
  }
}

/**
 * Generate Open Graph description based on post data.
 */
export function generateOgDescription(post: PostByIdResponse): string {
  if (post.caption) {
    return post.caption;
  }

  const elementType = post.elementType?.toLowerCase();
  const title = extractTitle(post);

  switch (elementType) {
    case 'track':
      return `Listen to ${title} on Cassette`;
    case 'album':
      return `Check out the album ${title} on Cassette`;
    case 'artist':
      return `Discover ${title} on Cassette`;
    case 'playlist':
      return `Explore the playlist ${title} on Cassette`;
    default:
      return `Share and discover music on Cassette`;
  }
}
