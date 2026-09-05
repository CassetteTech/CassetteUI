import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Memberships',
  robots: { index: false, follow: false },
};

export default function MembershipsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
