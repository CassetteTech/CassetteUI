'use client';

/** The fan membership offer as one card: the wallet pass head with the price,
    the plan description, any interval controls, the benefits, then the actions.
    The public profile and Curator Studio render this same card so the curator
    sees exactly what fans see. */

import { useRef, type ComponentProps, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { useSharedPosition } from '@/hooks/use-shared-position';
import { WalletPass } from '@/components/features/curator/wallet-pass';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';

export type OfferPrice = { faceMinor: number; serviceFeeMinor: number };
export type OfferBenefit = { featureKey: string; name: string; description: string };

export function BenefitList({ benefits }: { benefits: OfferBenefit[] }) {
  if (benefits.length === 0) return null;
  return (
    <ul className="mt-5 space-y-3" aria-label="Membership benefits">
      {benefits.map((benefit) => (
        <li key={benefit.featureKey} className="flex gap-2 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-semibold">{benefit.name}</span>
            {benefit.description && (
              <span className="mt-0.5 block text-muted-foreground">{benefit.description}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MembershipOffer({
  tier,
  curatorName,
  curatorHandle,
  curatorAvatarUrl,
  name,
  description,
  benefits,
  monthly,
  annual,
  currency,
  interval,
  controls,
  children,
  ...rest
}: Omit<ComponentProps<'div'>, 'children'> & {
  /** Short state printed on the pass head, e.g. "Per month" or "Preview". */
  tier: string;
  curatorName: string;
  curatorHandle: string;
  curatorAvatarUrl?: string;
  name: string;
  description: string;
  benefits: OfferBenefit[];
  /** Gross (fee-inclusive) prices; null when that interval is not offered or not valid yet. */
  monthly: OfferPrice | null;
  annual: OfferPrice | null;
  currency: string;
  /** The interval the pass price shows. */
  interval: 'month' | 'year';
  /** Interval selector, placed between the description and the benefits. */
  controls?: ReactNode;
  children?: ReactNode;
}) {
  const gross = (price: OfferPrice) => formatPaidPromotionMinorAmount(price.faceMinor + price.serviceFeeMinor, currency);
  // The profile and Studio each mount their own copy in the rail; on navigation the new copy slides in from the old one's spot.
  const passRef = useRef<HTMLDivElement>(null);
  useSharedPosition(passRef, 'membership-pass');
  const selected = interval === 'year' ? annual : monthly;
  const other = interval === 'year' ? monthly : annual;
  return (
    <WalletPass
      ref={passRef}
      product="Membership"
      tier={tier}
      holderName={curatorName}
      holderHandle={curatorHandle}
      avatarUrl={curatorAvatarUrl}
      active
      price={selected ? gross(selected) : undefined}
      priceUnit={`/${interval}`}
      priceNote={selected && (
        <>
          plus applicable tax
          {other && <><br />or {gross(other)}/{interval === 'year' ? 'month' : 'year'}</>}
        </>
      )}
      validityLabel="Plan"
      validityValue={name}
      {...rest}
    >
      {description.trim() && (
        <p className="whitespace-pre-line text-pretty break-words text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {controls}
      <BenefitList benefits={benefits} />
      {children}
    </WalletPass>
  );
}
