import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campaign details | Cassette',
  robots: { index: false, follow: false },
};

export default function PaidPromotionCampaignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
