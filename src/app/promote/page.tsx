import type { Metadata } from 'next';
import { PaidPromotionHome } from '@/components/features/paid-promotions/paid-promotion-home';

const title = 'Promote Your Music — Cassette';
const description =
  'Cassette promotes your track itself, on Cassette’s own Instagram. A real person listens to every submission — if we pass, you get the reason and a full refund. Priced up front, no bot networks, no guaranteed-streams schemes.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    images: [{ url: '/images/cassette_logo.png' }],
  },
  twitter: { title, description },
};

export default function PromotePage() {
  return <PaidPromotionHome />;
}
