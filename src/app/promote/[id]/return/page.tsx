import { PaidPromotionReturn } from '@/components/features/paid-promotions/paid-promotion-return';

interface PaidPromotionReturnPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaidPromotionReturnPage({ params }: PaidPromotionReturnPageProps) {
  const { id } = await params;
  return <PaidPromotionReturn campaignId={id} />;
}
