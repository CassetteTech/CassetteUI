import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Add music' };

export default function AddMusicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
