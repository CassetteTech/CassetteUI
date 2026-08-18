/** Redirects legacy curator links to the user's canonical public profile. */

import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CuratorPage({ params, searchParams }: Props) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const nextQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) nextQuery.append(key, item);
    } else if (value !== undefined) {
      nextQuery.set(key, value);
    }
  }

  const suffix = nextQuery.size > 0 ? `?${nextQuery}` : '';
  redirect(`/profile/${encodeURIComponent(username)}${suffix}`);
}
