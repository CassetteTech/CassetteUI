'use client';

import { useAuthState, useSignOut } from '@/hooks/use-auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertCircle, LogOut } from 'lucide-react';
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
  showSeparator?: boolean;
}

function getItemClassName(variant: NavigationSectionProps['variant'], isActive: boolean) {
  const base =
    'group flex items-center gap-3 rounded-xl transition-colors duration-200 active:scale-[0.99]';

  if (variant === 'primary') {
    return cn(
      base,
      'px-4 py-3.5 text-[15px] font-semibold tracking-tight',
      isActive
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'bg-muted/50 text-foreground hover:bg-muted'
    );
  }

  if (variant === 'account') {
    return cn(
      base,
      'px-3 py-2.5 text-sm font-medium',
      isActive
        ? 'bg-muted text-foreground'
        : 'text-foreground hover:bg-muted/70'
    );
  }

  return cn(
    base,
    'px-3 py-2.5 text-sm',
    isActive
      ? 'bg-muted/70 text-foreground'
      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
  );
}

function NavigationSection({
  title,
  items,
  pathname,
  variant,
  onLinkClick,
  username,
  showSeparator = false,
}: NavigationSectionProps) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label={title}
      className={cn(showSeparator && 'border-t border-border/40 pt-5')}
    >
      <div className={cn(variant === 'primary' ? 'space-y-1.5' : 'space-y-0.5')}>
        {items.map((item) => {
          const href = resolveNavHref(item, { username });
          const itemClassName = getItemClassName(variant, isNavItemActive(item, pathname));

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
                <item.icon
                  className={cn(
                    'shrink-0 transition-transform duration-200 group-hover:scale-110',
                    variant === 'primary' ? 'h-5 w-5' : 'h-4 w-4',
                  )}
                />
                <span>{item.label}</span>
              </a>
            );
          }

          return (
            <Link
              key={item.key}
              href={href}
              onClick={onLinkClick}
              className={itemClassName}
            >
              <item.icon
                className={cn(
                  'shrink-0 transition-transform duration-200 group-hover:scale-110',
                  variant === 'primary' ? 'h-5 w-5' : 'h-4 w-4',
                )}
              />
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
    <nav className="flex flex-col gap-5 pb-2">
      <NavigationSection
        title="Primary"
        items={primaryItems}
        pathname={pathname}
        variant="primary"
        onLinkClick={onLinkClick}
        username={user?.username}
      />

      {user && (
        <section aria-label="Account" className="border-t border-border/40 pt-5">
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
            className="group mt-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted/70 active:scale-[0.99]"
          >
            <LogOut className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
            <span>Sign Out</span>
          </button>
        </section>
      )}

      <section aria-label="Company and support" className="border-t border-border/40 pt-5">
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
          className="group mt-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted/60 hover:text-foreground active:scale-[0.99]"
        >
          <AlertCircle className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span>Report a Problem</span>
        </button>
      </section>
    </nav>
  );
}
