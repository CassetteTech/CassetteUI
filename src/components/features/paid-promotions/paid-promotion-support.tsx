import { LifeBuoy } from 'lucide-react';

// Placeholder channel until the team decides who owns paid-promotion support.
export const PAID_PROMOTION_SUPPORT_EMAIL = 'team@cassette.tech';

export function PaidPromotionSupportContact({ className = '' }: { className?: string }) {
  return (
    <p
      data-testid="paid-promotion-support-contact"
      className={`flex items-center justify-center gap-1.5 text-sm text-muted-foreground ${className}`}
    >
      <LifeBuoy className="size-4 shrink-0" aria-hidden="true" />
      <span>
        Questions or problems?{' '}
        <a
          href={`mailto:${PAID_PROMOTION_SUPPORT_EMAIL}`}
          className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
        >
          Email {PAID_PROMOTION_SUPPORT_EMAIL}
        </a>
      </span>
    </p>
  );
}
