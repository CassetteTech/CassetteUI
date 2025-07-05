import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface EntitySkeletonProps {
  isDesktop?: boolean;
}

export const EntitySkeleton: React.FC<EntitySkeletonProps> = ({ isDesktop = false }) => {
  return (
    <div className="min-h-screen relative">
      {/* Background with skeleton gradient */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: 'linear-gradient(180deg, #E0E0E0 0%, #E0E0E0CC 15%, #E0E0E099 30%, #E0E0E066 45%, #E0E0E040 60%, #E0E0E026 75%, #D1D5DB4D 90%, #D1D5DB 100%)'
        }}
      />
      
      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Skeleton */}
          <div className="pt-6 pb-8">
            <Skeleton className="w-20 h-6" />
          </div>
          
          {isDesktop ? (
            // Desktop Layout Skeleton
            <div className="flex gap-12 max-w-6xl mx-auto">
              {/* Left Column */}
              <div className="flex-shrink-0 text-center">
                {/* Type Badge */}
                <Skeleton className="w-16 h-5 mx-auto mb-6" />
                
                {/* Album Art */}
                <div className="relative inline-block mb-6">
                  <Skeleton className="w-[300px] h-[300px] rounded-xl" />
                  {/* Play button skeleton */}
                  <Skeleton className="absolute -bottom-4 -right-4 w-14 h-14 rounded-full" />
                </div>
                
                {/* Title */}
                <Skeleton className="w-48 h-8 mx-auto mb-2" />
                {/* Artist */}
                <Skeleton className="w-32 h-6 mx-auto" />
              </div>
              
              {/* Right Column */}
              <div className="flex-1 pt-16">
                {/* Description Box */}
                <div className="mb-8 p-6 border-2 border-gray-200 rounded-lg bg-white/50">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="w-24 h-5 mb-2" />
                      <Skeleton className="w-full h-4 mb-1" />
                      <Skeleton className="w-3/4 h-4" />
                    </div>
                  </div>
                </div>
                
                {/* Divider */}
                <Skeleton className="w-full h-0.5 mb-8" />
                
                {/* Streaming Links Container */}
                <div className="p-6 rounded-2xl bg-white/30 border border-gray-200 mb-8">
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
          ) : (
            // Mobile Layout Skeleton
            <div className="max-w-lg mx-auto">
              <div className="text-center">
                {/* Type Badge */}
                <Skeleton className="w-16 h-5 mx-auto mb-6" />
                
                {/* Album Art */}
                <div className="relative inline-block mb-6">
                  <Skeleton className="w-[200px] h-[200px] rounded-xl" />
                  {/* Play button skeleton */}
                  <Skeleton className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full" />
                </div>
                
                {/* Title */}
                <Skeleton className="w-40 h-7 mx-auto mb-2" />
                {/* Artist */}
                <Skeleton className="w-28 h-5 mx-auto mb-6" />
                
                {/* Description Box */}
                <div className="mb-6 p-4 border-2 border-gray-200 rounded-lg bg-white/50">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <div className="flex-1 text-left">
                      <Skeleton className="w-20 h-4 mb-2" />
                      <Skeleton className="w-full h-3 mb-1" />
                      <Skeleton className="w-3/4 h-3" />
                    </div>
                  </div>
                </div>
                
                {/* Divider */}
                <Skeleton className="w-full h-0.5 mb-6 mx-4" />
                
                {/* Streaming Links Container */}
                <div className="p-4 rounded-2xl bg-white/30 border border-gray-200 mb-6">
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
    </div>
  );
};