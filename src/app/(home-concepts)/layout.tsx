import type { Metadata } from 'next';
import { ConceptSwitcher } from '@/components/home-concepts/concept-switcher';

// Design explorations for the home page. Not for search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function HomeConceptsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ConceptSwitcher />
    </>
  );
}
