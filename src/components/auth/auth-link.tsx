'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, type ComponentProps } from 'react';
import { buildAuthPath } from '@/utils/auth-redirect';

type AuthLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  authPath: '/auth/signin' | '/auth/signup';
};

function AuthLinkWithQuery({ authPath, ...props }: AuthLinkProps) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return <Link href={buildAuthPath(authPath, query ? `${pathname}?${query}` : pathname)} {...props} />;
}

/**
 * A sign-in or sign-up link that returns to the current page and its query. The query is read
 * inside its own Suspense boundary, so a page that renders statically does not need one; until
 * it is read, the link returns to the path alone.
 */
export function AuthLink({ authPath, ...props }: AuthLinkProps) {
  const pathname = usePathname();
  return (
    <Suspense fallback={<Link href={buildAuthPath(authPath, pathname)} {...props} />}>
      <AuthLinkWithQuery authPath={authPath} {...props} />
    </Suspense>
  );
}
