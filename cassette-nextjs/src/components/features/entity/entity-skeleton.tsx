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
        <div className="pt-4 pb-6 px-3">
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
            // Desktop Layout Skeleton - improved layout matching the updated post page
            <div className="px-8 max-w-6xl mx-auto pb-8">
              <div className="flex gap-8 items-start">
                {/* Left Column - Album Art and Info (flex: 2) */}
                <div className="flex-[2] flex flex-col items-center">
                {/* Type Badge */}
                <Skeleton className="h-5 w-16 mx-auto mb-8" />
                
                {/* Album Art with Shadow */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 bg-black/15 rounded-xl blur-lg" />
                  <Skeleton className="relative w-[280px] h-[280px] rounded-xl" />
                </div>
                
                {/* Title and Artist */}
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48 mx-auto" />
                  <Skeleton className="h-4 w-32 mx-auto" />
                </div>
              </div>
              
                <div className="flex-[3] pt-8">
                  {/* Description Box */}
                  <div className="mb-6 p-5 border border-border rounded-lg">
                    <div className="flex items-start space-x-4">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  </div>
                
                {/* Divider */}
                <div className="border-t border-border mb-6" />
                
                  {/* Streaming Links Container */}
                  <div className="mb-6 p-5 rounded-2xl border border-border">
                    <div className="grid grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-12 rounded-lg" />
                      ))}
                    </div>
                  </div>
                
                {/* Report Button */}
                <Skeleton className="w-40 h-12 rounded-lg" />
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
                    <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 bg-black/15 rounded-xl blur-lg" />
                    <Skeleton className="relative w-[calc(100vw/2.3)] h-[calc(100vw/2.3)] max-w-[200px] max-h-[200px] rounded-xl" />
                  </div>
                </div>
                
                {/* Title and Artist */}
                <div className="space-y-2 mb-6">
                  <Skeleton className="h-6 w-40 mx-auto" />
                  <Skeleton className="h-4 w-28 mx-auto" />
                </div>
                            
                
                {/* Divider */}
                <div className="border-t border-border mb-6" />
                
                {/* Streaming Links Container */}
                <div className="mb-6 p-4 rounded-2xl border border-border">
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-10 rounded-lg" />
                    ))}
                  </div>
                </div>
                
                {/* Report Button */}
                <Skeleton className="w-36 h-10 rounded-lg mx-auto" />
              </div>
            </div>
          )}
      </div>
    </div>
  );
};