import { Suspense } from 'react';
import { PaidPromotionReturn } from '@/components/features/paid-promotions/paid-promotion-return';

interface PaidPromotionReturnPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaidPromotionReturnPage({ params }: PaidPromotionReturnPageProps) {
  const { id } = await params;
  // Suspense boundary required for useSearchParams (cancel-return marker).
  return (
    <Suspense fallback={null}>
      <PaidPromotionReturn campaignId={id} />
    </Suspense>
  );
}
