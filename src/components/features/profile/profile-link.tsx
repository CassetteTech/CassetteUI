'use client';

/** A link to a person's page. Another person's username opens their public page. The signed-in
    user's own username opens Curator Studio, their home; their public page is a preview reached
    from Studio. Every avatar or username that names a person goes through this component, so one
    rule decides where "me" leads. */

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useAuthState } from '@/hooks/use-auth';

export function profilePath(username: string, viewerUsername?: string | null) {
  return username === viewerUsername ? '/studio' : `/profile/${username}`;
}

export function ProfileLink({ username, ...props }: Omit<ComponentProps<typeof Link>, 'href'> & { username: string }) {
  const { user } = useAuthState();
  return <Link href={profilePath(username, user?.username)} {...props} />;
}
