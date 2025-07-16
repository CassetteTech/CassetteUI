import React from 'react';
import { PlayPreview } from './play-preview';

// Example usage of PlayPreview component in different contexts

interface PostWithPreview {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  previewUrl?: string;
  description?: string;
}

// 1. In a Post component when preview is available
export function PostWithPreview({ post }: { post: PostWithPreview }) {
  return (
    <div className="space-y-4">
      {/* Other post content */}
      <h2>{post.title}</h2>
      <p>{post.description}</p>
      
      {/* Show PlayPreview only when previewUrl exists */}
      {post.previewUrl && (
        <PlayPreview
          previewUrl={post.previewUrl}
          title={post.title}
          artist={post.artist}
          artwork={post.artwork}
          className="mt-4"
        />
      )}
    </div>
  );
}

// 2. In a feed or list of posts
export function PostFeed({ posts }: { posts: PostWithPreview[] }) {
  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div key={post.id} className="border-b pb-4">
          <h3>{post.title}</h3>
          {post.previewUrl && (
            <PlayPreview
              previewUrl={post.previewUrl}
              title={post.title}
              artist={post.artist}
              artwork={post.artwork}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// 3. In a compact card layout
export function CompactPostCard({ post }: { post: PostWithPreview }) {
  return (
    <div className="bg-card rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold">{post.title}</h4>
          <p className="text-sm text-muted-foreground">{post.artist}</p>
        </div>
      </div>
      
      {post.previewUrl && (
        <PlayPreview
          previewUrl={post.previewUrl}
          title={post.title}
          artist={post.artist}
          artwork={post.artwork}
        />
      )}
    </div>
  );
}

// 4. Integration with existing Post page
// In your post/page.tsx, you could replace the AudioPreview with PlayPreview:
/*
{!isArtist && postData?.previewUrl && (
  <PlayPreview 
    previewUrl={postData.previewUrl}
    title={metadata.title}
    artist={metadata.artist}
    artwork={metadata.artwork}
    className="mt-4"
  />
)}
*/