import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Curator Studio',
  robots: { index: false, follow: false },
};

export default function CuratorStudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
