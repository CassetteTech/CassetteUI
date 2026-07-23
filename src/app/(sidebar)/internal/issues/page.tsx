import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { IssuesContainer } from '../_components/issues-container';

export default function InternalIssuesPage() {
  return (
    <div className="domain-eng">
      <Suspense fallback={<PageLoader message="Loading issues..." />}>
        <IssuesContainer />
      </Suspense>
    </div>
  );
}
