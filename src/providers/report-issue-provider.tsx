'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ReportIssueModal } from '@/components/features/report-issue-modal';

interface ConversionData {
  elementType?: string;
  title?: string;
  artist?: string;
  platforms?: Record<string, unknown>;
}

interface OpenReportModalOptions {
  sourceContext?: string;
  sourceLink?: string;
  conversionData?: ConversionData;
}

interface ReportIssueContextValue {
  openReportModal: (options?: OpenReportModalOptions) => void;
  closeReportModal: () => void;
}

const ReportIssueContext = createContext<ReportIssueContextValue | null>(null);

function getSourceContextFromPath(pathname: string): string {
  if (pathname.startsWith('/post/')) return 'post_view';
  if (pathname.startsWith('/profile/')) return 'profile';
  if (pathname === '/add-music') return 'add_music';
  if (pathname === '/') return 'home';
  return pathname;
}

export function ReportIssueProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sourceContext, setSourceContext] = useState('');
  const [sourceLink, setSourceLink] = useState<string | undefined>();
  const [conversionData, setConversionData] = useState<ConversionData | undefined>();

  const openReportModal = useCallback((options?: OpenReportModalOptions) => {
    setSourceContext(options?.sourceContext || getSourceContextFromPath(pathname));
    setSourceLink(options?.sourceLink);
    setConversionData(options?.conversionData);
    setOpen(true);
  }, [pathname]);

  const closeReportModal = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <ReportIssueContext.Provider value={{ openReportModal, closeReportModal }}>
      {children}
      <ReportIssueModal
        open={open}
        onOpenChange={setOpen}
        sourceContext={sourceContext}
        sourceLink={sourceLink}
        conversionData={conversionData}
      />
    </ReportIssueContext.Provider>
  );
}

export function useReportIssue(): ReportIssueContextValue {
  const context = useContext(ReportIssueContext);
  if (!context) {
    throw new Error('useReportIssue must be used within a ReportIssueProvider');
  }
  return context;
}
