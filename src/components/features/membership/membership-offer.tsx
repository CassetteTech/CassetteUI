'use client';

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
  summary,
  children,
  ...rest
}: Omit<ComponentProps<'div'>, 'children'> & {
  tier: string;
  curatorName: string;
  curatorHandle: string;
  curatorAvatarUrl?: string;
  name: string;
  description: string;
  benefits: OfferBenefit[];
  monthly: OfferPrice | null;
  annual: OfferPrice | null;
  currency: string;
  interval: 'month' | 'year';
  controls?: ReactNode;
  summary?: ReactNode;
  children?: ReactNode;
}) {
  const gross = (price: OfferPrice) => formatPaidPromotionMinorAmount(price.faceMinor + price.serviceFeeMinor, currency);
  const passRef = useRef<HTMLDivElement>(null);
  useSharedPosition(passRef, 'membership-pass');
  const selected = interval === 'year' ? annual : monthly;
  const other = interval === 'year' ? monthly : annual;
  return (
    <WalletPass
      ref={passRef}
      product="Membership"
      tier={tier}
      summary={summary}
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
        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {controls}
      <BenefitList benefits={benefits} />
      {children}
    </WalletPass>
  );
}
