import Link from 'next/link';
import type { ComponentProps } from 'react';

/** Viewport prefetch of `/post/[id]` runs its server `generateMetadata`, one Bridge post read per visible link. */
export function PostLink(props: Omit<ComponentProps<typeof Link>, 'prefetch'>) {
  return <Link {...props} prefetch={false} />;
}
