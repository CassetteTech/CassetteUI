import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

interface EntitySkeletonProps {
  isDesktop?: boolean;
}

export const EntitySkeleton: React.FC<EntitySkeletonProps> = ({ isDesktop = false }) => {
  return (
    <div className="min-h-screen relative">
      {/* Background with skeleton gradient */}
      <div 
        className="fixed inset-0 z-0 bg-gradient-to-b from-muted/50 via-muted/30 to-background"
      />
      
      <div className="relative z-10 min-h-screen">
        {/* Header Toolbar Skeleton - matching Flutter PostHeaderToolbar */}
        <div className="pt-4 pb-6 px-3 relative z-50">
          <div className="flex items-center justify-between">
            <button className="flex items-center gap-2 text-foreground relative z-10">
              <Image
                src="/images/ic_back.png"
                alt="Back"
                width={16}
                height={16}
                className="object-contain"
              />
            </button>
            <div className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded" />
            </div>
          </div>
        </div>
          
          {isDesktop ? (
            // Desktop Layout Skeleton - enhanced with better spacing
            <div className="px-8 max-w-7xl mx-auto pb-8">
              <div className="flex gap-12 items-center min-h-[80vh]">
                {/* Left Column - Album Art and Info (flex: 2) */}
                <div className="flex-[2] flex flex-col items-center min-w-0">
                  {/* Type Badge */}
                  <Skeleton className="h-6 w-20 mb-8" />
                  
                  {/* Album Art with Shadow - increased size for desktop */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg" />
                    <Skeleton className="relative w-[400px] h-[400px] rounded-xl" />
                  </div>
                </div>
                
                {/* Right Column - Links and Description (flex: 3) */}
                <div className="flex-[3] max-h-[75vh] overflow-hidden">
                  <div className="h-full overflow-y-auto pr-4">
                    <div className="space-y-6">
                      {/* Track Information Card */}
                      <div className="p-5 bg-card/40 rounded-xl border border-border/50 backdrop-blur-sm">
                        <div className="space-y-3">
                          {/* Title */}
                          <Skeleton className="h-6 w-48 mx-auto" />
                          
                          {/* Artist */}
                          <Skeleton className="h-4 w-32 mx-auto" />
                          
                          {/* Separator */}
                          <div className="border-t border-border/30 mx-4" />
                          
                          {/* Metadata - Duration and Album */}
                          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
                            <Skeleton className="h-4 w-24" />
                            <span className="text-muted-foreground">•</span>
                            <Skeleton className="h-4 w-32" />
                          </div>
                          
                          {/* Genres */}
                          <div className="border-t border-border/30 mx-4" />
                          <div className="flex flex-wrap gap-2 justify-center">
                            {[1, 2, 3].map((i) => (
                              <Skeleton key={i} className="h-6 w-16 rounded-full" />
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Streaming Links Container */}
                      <div className="p-5 bg-card/50 rounded-2xl border border-border shadow-sm backdrop-blur-sm relative z-10">
                        <Skeleton className="h-5 w-24 mb-4" />
                        <div className="grid grid-cols-3 gap-4">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} className="h-12 rounded-lg" />
                          ))}
                        </div>
                      </div>
                      
                      {/* Report Button */}
                      <div className="flex justify-center">
                        <Skeleton className="w-40 h-10 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Mobile Layout Skeleton - matching Flutter body()
            <div className="px-5 sm:px-10 pb-6">
              <div className="text-center">
                {/* Type Badge */}
                <Skeleton className="h-5 w-16 mx-auto mb-6" />
                
                {/* Album Art Container */}
                <div className="mb-5">
                  {/* Album Art with Shadow */}
                  <div className="relative inline-block">
                    <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 bg-black/25 rounded-xl blur-lg" />
                    <Skeleton className="relative w-[calc(100vw/2.3)] h-[calc(100vw/2.3)] max-w-[200px] max-h-[200px] rounded-xl" />
                  </div>
                </div>
                
                {/* Track Information Card - Mobile */}
                <div className="mb-6 p-4 bg-card/40 rounded-xl border border-border/50 backdrop-blur-sm">
                  <div className="space-y-3">
                    {/* Title */}
                    <Skeleton className="h-6 w-40 mx-auto" />
                    
                    {/* Artist */}
                    <Skeleton className="h-4 w-28 mx-auto" />
                    
                    {/* Separator */}
                    <div className="border-t border-border/30" />
                    
                    {/* Metadata */}
                    <div className="flex flex-wrap justify-center gap-2">
                      <Skeleton className="h-3 w-20" />
                      <span className="text-muted-foreground">•</span>
                      <Skeleton className="h-3 w-24" />
                    </div>
                    
                    {/* Genres */}
                    <div className="border-t border-border/30" />
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-5 w-14 rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <div className="mb-6 p-4 bg-background rounded-lg border-2 border-text-primary/30 text-left">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-4 w-16 mb-1" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="border-t border-border mb-6" />
                
                {/* Streaming Links Container */}
                <div className="p-4 bg-card/50 rounded-2xl border border-border shadow-sm backdrop-blur-sm mb-6 relative z-10">
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-10 rounded-lg" />
                    ))}
                  </div>
                </div>
                
                {/* Report Button */}
                <Skeleton className="w-36 h-12 rounded-lg mx-auto" />
              </div>
            </div>
          )}
      </div>
    </div>
  );
};