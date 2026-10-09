'use client';

import { useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UrlBar } from '@/components/ui/url-bar';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
import { ConversionHeading } from '@/components/features/conversion/conversion-heading';
import { ConversionStageLabel } from '@/components/features/conversion/conversion-stage-label';
import { AppleMusicHelpModal } from '@/components/features/apple-music-help-modal';
import { SearchResults } from '@/components/features/search-results';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { HomeSearch } from './use-home-search';

const heights = {
  sm: 'h-12 sm:h-12 md:h-12 lg:h-14',
  md: 'h-12 sm:h-14 md:h-16 lg:h-20',
};

export interface HomeSearchBarProps {
  search: HomeSearch;
  size?: keyof typeof heights;
  placeholder: string;
  /** Hide the results when focus leaves the bar (dropdown layouts). */
  closeOnBlur?: boolean;
  className?: string;
}

/** The search bar: a white hairline field on any paper, with the conversion
    beam, in-place narration while converting, and the unsupported-link help. */
export function HomeSearchBar({
  search,
  size = 'md',
  placeholder,
  closeOnBlur = false,
  className,
}: HomeSearchBarProps) {
  const { isConverting, convertingMeta } = search;
  const errorId = useId();
  return (
    <div className={cn('relative w-full', className)}>
      <AnimatePresence>
        {isConverting && convertingMeta && (
          <ConversionHeading
            key="conversion-heading"
            kicker={convertingMeta.kicker}
            headline={convertingMeta.headline}
            className="mb-5"
          />
        )}
      </AnimatePresence>
      <ConversionBeam active={isConverting}>
        <UrlBar
          variant="dark"
          className={cn('w-full', heights[size])}
          hasError={!!search.urlError}
          beamActive={isConverting}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isConverting ? (
              <motion.div
                key="conversion-narration"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="flex h-full w-full flex-col items-center justify-center px-4 sm:px-6"
              >
                <span className="w-full truncate text-center text-sm sm:text-base font-semibold text-foreground">
                  {convertingMeta?.title ?? convertingMeta?.fallbackLabel ?? 'Music link'}
                </span>
                <ConversionStageLabel label={search.conversionStageLabel} />
              </motion.div>
            ) : (
              <motion.input
                key="search-input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                ref={search.inputRef}
                data-testid="home-search-input"
                value={search.musicUrl}
                onChange={search.onChange}
                onFocus={search.onFocus}
                onBlur={closeOnBlur ? search.dismiss : undefined}
                onPaste={search.onPaste}
                onKeyDown={search.onKeyDown}
                placeholder={placeholder}
                aria-invalid={search.urlError ? true : undefined}
                aria-describedby={search.urlError ? errorId : undefined}
                className="w-full h-full bg-transparent border-none outline-none text-center text-foreground placeholder:text-muted-foreground px-3 sm:px-4 md:px-6 text-base"
                style={{ fontSize: '16px', touchAction: 'manipulation' }}
              />
            )}
          </AnimatePresence>
        </UrlBar>
      </ConversionBeam>
      {search.urlError && (
        <p id={errorId} role="alert" className="text-destructive text-sm mt-2 text-center px-4 font-semibold">
          {search.urlError}{' '}
          <button
            type="button"
            onClick={() => search.setIsHelpModalOpen(true)}
            className="underline hover:text-destructive/80 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 rounded"
          >
            Show me how.
          </button>
        </p>
      )}
      <AppleMusicHelpModal open={search.isHelpModalOpen} onOpenChange={search.setIsHelpModalOpen} />
    </div>
  );
}

/** Top charts or live results as a hairline card (no offset shadow), flush
    with whatever holds it. Hidden while a conversion runs. */
export function HomeSearchResults({
  search,
  className,
  chrome = 'ink',
}: {
  search: HomeSearch;
  className?: string;
  chrome?: 'ink' | 'bare';
}) {
  if (search.isConverting) return null;
  return (
    <SearchResults
      results={search.displayData}
      query={search.debouncedSearchTerm}
      isLoading={search.isLoadingCharts}
      isSearching={search.isSearchingMusic}
      showSearchResults={search.showSearchResults}
      onSelectItem={search.selectItem}
      onClose={search.close}
      SkeletonComponent={Skeleton}
      chrome={chrome}
      className={cn('max-w-none px-0 mb-0', className)}
    />
  );
}

/** The bar with its results as a dropdown that opens on focus and closes
    when focus leaves, so a composed hero stays composed until it is used. */
export function HomeSearchDropdown({ className, ...bar }: HomeSearchBarProps) {
  const { search } = bar;
  const open = search.isSearchActive && !search.isConverting;
  return (
    <div className={cn('relative', className)}>
      <HomeSearchBar {...bar} closeOnBlur />
      <AnimatePresence>
        {open && (
          <motion.div
            key="home-search-dropdown"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-x-0 top-full z-30 mt-2"
          >
            <HomeSearchResults search={search} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
