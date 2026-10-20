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
import { AuthLink } from '@/components/auth/auth-link';
import { pendingActionService } from '@/utils/pending-action';
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
            <AuthLink
              authPath="/auth/signin"
              onClick={onLinkClick}
              className={getItemClassName('account', false)}
            >
              <span>Sign In</span>
            </AuthLink>
            <AuthLink
              authPath="/auth/signup"
              onClick={() => {
                pendingActionService.saveOwnerlessPostForSignup();
                onLinkClick?.();
              }}
              className={getItemClassName('account', false)}
            >
              <span>Sign Up</span>
            </AuthLink>
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
