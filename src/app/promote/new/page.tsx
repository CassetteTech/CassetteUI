import { PaidPromotionIntake } from '@/components/features/paid-promotions/paid-promotion-intake';

export default async function NewPaidPromotionPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string | string[] }>;
}) {
  const subject = (await searchParams).subject;
  return <PaidPromotionIntake repeatElementId={typeof subject === 'string' ? subject : undefined} />;
}
