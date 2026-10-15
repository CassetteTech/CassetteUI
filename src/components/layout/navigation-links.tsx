'use client';

import { useAuthState, useSignOut } from '@/hooks/use-auth';
import {
  usePaidPromotionAccountVisible,
  usePaidPromotionSalesEnabled,
} from '@/hooks/use-paid-promotion-availability';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  addMusicHrefForPage,
  appNavOrder,
  companyNavItems,
  getOrderedNavItems,
  getVisibleNavItems,
  isNavItemActive,
  primaryNavItems,
  promoteNavOrder,
  resolveNavHref,
  type NavigationItemDefinition,
} from './navigation-config';
import { useReportIssue } from '@/providers/report-issue-provider';

interface NavigationLinksProps {
  onLinkClick?: () => void;
}

interface NavigationSectionProps {
  title: string;
  titleHidden?: boolean;
  items: NavigationItemDefinition[];
  pathname: string | null;
  variant: 'primary' | 'account' | 'secondary';
  onLinkClick?: () => void;
  username?: string | null;
  children?: React.ReactNode;
}

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

/** The menu's staggered entrance reads its order from this custom property. */
function revealIndex(index: number) {
  return { '--reveal-index': index };
}

function SectionHeading({ children, hidden = false }: { children: React.ReactNode; hidden?: boolean }) {
  return (
    <h3 className={hidden ? 'sr-only' : 'mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/80'}>
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
  titleHidden = false,
  items,
  pathname,
  variant,
  onLinkClick,
  username,
  children,
}: NavigationSectionProps) {
  if (items.length === 0 && !children) return null;

  return (
    <section aria-label={title}>
      <SectionHeading hidden={titleHidden}>{title}</SectionHeading>
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
        {children}
      </div>
    </section>
  );
}

export function NavigationLinks({ onLinkClick }: NavigationLinksProps) {
  const { user } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const { openReportModal } = useReportIssue();
  const pathname = usePathname();
  const salesEnabled = usePaidPromotionSalesEnabled();
  const accountVisible = usePaidPromotionAccountVisible();

  const paidPromotion = { salesEnabled, accountVisible };
  const companyItems = getVisibleNavItems(companyNavItems, user);

  const handleSignOut = () => {
    signOut();
    onLinkClick?.();
  };

  return (
    <nav className="flex flex-col gap-5">
      {user ? (
        <div data-menu-reveal style={revealIndex(2)}>
          <Button asChild size="sm" className="mb-2 w-full bg-foreground text-background hover:bg-foreground/90">
            <Link href={addMusicHrefForPage(pathname)} onClick={onLinkClick}>
              <Plus aria-hidden />
              Add music
            </Link>
          </Button>
          <NavigationSection
            title="Pages"
            titleHidden
            items={getOrderedNavItems(appNavOrder, user, paidPromotion)}
            pathname={pathname}
            variant="primary"
            onLinkClick={onLinkClick}
            username={user.username}
          />
        </div>
      ) : (
        <div data-menu-reveal style={revealIndex(2)}>
          <NavigationSection
            title="Browse"
            items={getVisibleNavItems(primaryNavItems, user, { salesEnabled })}
            pathname={pathname}
            variant="primary"
            onLinkClick={onLinkClick}
          />
        </div>
      )}

      {!user && (
        <section
          aria-label="Account"
          data-menu-reveal
          style={revealIndex(3)}
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
        <div data-menu-reveal style={revealIndex(3)}>
          <NavigationSection
            title="Account"
            items={getOrderedNavItems(promoteNavOrder, user, paidPromotion).slice(0, 1)}
            pathname={pathname}
            variant="account"
            onLinkClick={onLinkClick}
            username={user.username}
          >
            <button onClick={handleSignOut} className={cn(getItemClassName('account', false), 'text-left')}>
              <span>Sign Out</span>
            </button>
          </NavigationSection>
        </div>
      )}

      <div data-menu-reveal style={revealIndex(4)}>
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
