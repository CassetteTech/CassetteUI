'use client';

// Resolves what an auth page is gating on: the ?redirect param covers the
// direct funnel; the stored fallback covers resumed flows (a fresh tab with
// no params), applied after mount so server and first client render agree.

import { useEffect, useRef, useState } from 'react';
import { captureClientEvent } from '@/lib/analytics/client';
import { getDeviceCategory } from '@/lib/analytics/audience';
import {
  authRedirectService,
  isPromoteIntentRedirect,
  parseMembershipIntentRedirect,
  type MembershipIntent,
} from '@/utils/auth-redirect';
import {
  useMembershipPurchaseContext,
  type MembershipPurchaseContext,
} from '@/components/features/auth/membership-purchase-summary';

export type AuthIntent = {
  isPromoteIntent: boolean;
  membershipIntent: MembershipIntent | null;
  purchaseContext: MembershipPurchaseContext;
};

export function useAuthIntent(redirect: string | null, route: string): AuthIntent {
  const [storedRedirect, setStoredRedirect] = useState<string | null>(null);
  useEffect(() => {
    authRedirectService.save(redirect);
    setStoredRedirect(authRedirectService.get());
  }, [redirect]);

  const effectiveRedirect = redirect ?? storedRedirect;
  const membershipIntent = parseMembershipIntentRedirect(effectiveRedirect);
  const purchaseContext = useMembershipPurchaseContext(membershipIntent);

  // One membership_auth_started per auth page visit, sent once the trusted
  // offer has resolved so the opaque curator/plan ids ride along when known.
  const started = useRef(false);
  const settled = membershipIntent !== null && !purchaseContext.isPending;
  useEffect(() => {
    if (!settled || started.current) return;
    started.current = true;
    void captureClientEvent('membership_auth_started', {
      route,
      source_surface: 'auth',
      is_authenticated: false,
      billing_interval: membershipIntent?.interval,
      curator_id: purchaseContext.data?.curator.id,
      membership_plan_id: purchaseContext.data?.membership?.planId ?? undefined,
      device_category: getDeviceCategory(),
    });
  }, [settled, route, membershipIntent?.interval, purchaseContext.data]);

  return {
    isPromoteIntent: isPromoteIntentRedirect(effectiveRedirect),
    membershipIntent,
    purchaseContext,
  };
}
