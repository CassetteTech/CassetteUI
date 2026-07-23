import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { SentinelFindingsTab } from '../_components/sentinel-findings-tab';

export default function InternalSentinelPage() {
  return (
    <div className="domain-eng">
      <Suspense fallback={<PageLoader message="Loading Sentinel..." />}>
        <SentinelFindingsTab />
      </Suspense>
    </div>
  );
}
