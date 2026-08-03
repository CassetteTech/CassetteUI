import { Suspense } from 'react';
import { PaidPromotionDetail } from '@/components/features/paid-promotions/paid-promotion-detail';
import { PageLoader } from '@/components/ui/page-loader';

interface PaidPromotionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaidPromotionDetailPage({ params }: PaidPromotionDetailPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageLoader message="Loading campaign details…" />}>
      <PaidPromotionDetail campaignId={id} />
    </Suspense>
  );
}
