import { PaidPromotionDetail } from '../_components/paid-promotion-detail';

export default async function PaidPromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaidPromotionDetail campaignId={id} />;
}
