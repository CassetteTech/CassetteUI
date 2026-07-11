'use client';

import { useAuthState, useSignOut } from '@/hooks/use-auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  accountNavItems,
  companyNavItems,
  getVisibleNavItems,
  isNavItemActive,
  primaryNavItems,
  resolveNavHref,
  type NavigationItemDefinition,
} from './navigation-config';
import { useReportIssue } from '@/providers/report-issue-provider';

interface NavigationLinksProps {
  onLinkClick?: () => void;
}

interface NavigationSectionProps {
  title: string;
  items: NavigationItemDefinition[];
  pathname: string | null;
  variant: 'primary' | 'account' | 'secondary';
  onLinkClick?: () => void;
  username?: string | null;
}

// Text-only editorial rows: Atkinson bold is the same voice as the desktop
// navbar links; size and color carry the hierarchy, hairlines carry the grid.
function getItemClassName(variant: NavigationSectionProps['variant'], isActive: boolean) {
  const base =
    'flex w-full items-center justify-between gap-3 font-atkinson font-bold transition-colors duration-150';

  if (variant === 'primary') {
    return cn(
      base,
      'py-3 text-[17px]',
      isActive ? 'text-primary' : 'text-foreground active:text-primary',
    );
  }

  if (variant === 'account') {
    return cn(
      base,
      'py-2.5 text-base',
      isActive ? 'text-primary' : 'text-foreground active:text-primary',
    );
  }

  return cn(
    base,
    'py-2.5 text-[15px]',
    isActive ? 'text-primary' : 'text-muted-foreground active:text-primary',
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/80">
      {children}
    </h3>
  );
}

function ExternalMark() {
  return (
    <span aria-hidden="true" className="font-mono text-sm leading-none text-muted-foreground/60">
      ↗
    </span>
  );
}

function NavigationSection({
  title,
  items,
  pathname,
  variant,
  onLinkClick,
  username,
}: NavigationSectionProps) {
  if (items.length === 0) return null;

  return (
    <section aria-label={title}>
      <SectionHeading>{title}</SectionHeading>
      <div className="divide-y divide-border/40">
        {items.map((item) => {
          const href = resolveNavHref(item, { username });
          const isActive = isNavItemActive(item, pathname, { username });
          const itemClassName = getItemClassName(variant, isActive);

          if (item.external) {
            return (
              <a
                key={item.key}
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={onLinkClick}
                className={itemClassName}
              >
                <span>{item.label}</span>
                <ExternalMark />
              </a>
            );
          }

          return (
            <Link key={item.key} href={href} onClick={onLinkClick} className={itemClassName}>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function NavigationLinks({ onLinkClick }: NavigationLinksProps) {
  const { user } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const { openReportModal } = useReportIssue();
  const pathname = usePathname();

  const primaryItems = getVisibleNavItems(
    primaryNavItems.filter(
      (item) => item.key !== 'home' && item.key !== 'add-music',
    ),
    user,
  );
  const accountItems = getVisibleNavItems(accountNavItems, user).filter(
    (item) => item.key !== 'edit-profile',
  );
  const companyItems = getVisibleNavItems(companyNavItems, user);

  const handleSignOut = () => {
    signOut();
    onLinkClick?.();
  };

  return (
    <nav className="flex flex-col gap-5">
      <div data-menu-reveal style={{ '--reveal-index': 2 } as React.CSSProperties}>
        <NavigationSection
          title="Browse"
          items={primaryItems}
          pathname={pathname}
          variant="primary"
          onLinkClick={onLinkClick}
          username={user?.username}
        />
      </div>

      {!user && (
        <section
          aria-label="Account"
          data-menu-reveal
          style={{ '--reveal-index': 3 } as React.CSSProperties}
        >
          <SectionHeading>Account</SectionHeading>
          <div className="divide-y divide-border/40">
            <Link
              href="/auth/signin"
              onClick={onLinkClick}
              className={getItemClassName('account', false)}
            >
              <span>Sign In</span>
            </Link>
            <Link
              href="/auth/signup"
              onClick={onLinkClick}
              className={getItemClassName('account', false)}
            >
              <span>Sign Up</span>
            </Link>
          </div>
        </section>
      )}

      {user && (
        <div data-menu-reveal style={{ '--reveal-index': 3 } as React.CSSProperties}>
          <NavigationSection
            title="Account"
            items={accountItems}
            pathname={pathname}
            variant="account"
            onLinkClick={onLinkClick}
            username={user.username}
          />
          <button
            onClick={handleSignOut}
            className={cn(getItemClassName('account', false), 'border-t border-border/40 text-left')}
          >
            <span>Sign Out</span>
          </button>
        </div>
      )}

      <div data-menu-reveal style={{ '--reveal-index': 4 } as React.CSSProperties}>
        <NavigationSection
          title="Company & Support"
          items={companyItems}
          pathname={pathname}
          variant="secondary"
          onLinkClick={onLinkClick}
          username={user?.username}
        />
        <button
          onClick={() => {
            openReportModal();
            onLinkClick?.();
          }}
          className={cn(getItemClassName('secondary', false), 'border-t border-border/40 text-left')}
        >
          <span>Report a Problem</span>
        </button>
      </div>
    </nav>
  );
}
