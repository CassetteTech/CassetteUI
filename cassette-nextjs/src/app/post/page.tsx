'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { MusicLinkConversion, ElementType } from '@/types';
import { EntitySkeleton } from '@/components/features/entity/entity-skeleton';
import { StreamingLinks } from '@/components/features/entity/streaming-links';
import { AudioPreview } from '@/components/features/entity/audio-preview';
import { AnimatedButton } from '@/components/ui/animated-button';
import { AnimatedColorBackground } from '@/components/ui/animated-color-background';
import { ColorExtractor } from '@/services/color-extractor';
import { MainContainer } from '@/components/ui/container';
import { HeadlineText, BodyText, UIText } from '@/components/ui/typography';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/api';
import { useMusicLinkConversion } from '@/hooks/use-music';

function PostPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [postData, setPostData] = useState<MusicLinkConversion & { previewUrl?: string; description?: string; username?: string; } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Animation states
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  
  // Use the conversion mutation
  const { mutate: convertLink, isPending: isConverting } = useMusicLinkConversion();
  
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check URL params
        const urlParam = searchParams.get('url');
        const dataParam = searchParams.get('data');
        const postId = searchParams.get('id');
        
        if (urlParam) {
          // New flow: we have a URL to convert
          try {
            const decodedUrl = decodeURIComponent(urlParam);
            console.log('📱 Post page: Converting URL:', decodedUrl);
            
            // Trigger conversion
            convertLink(decodedUrl, {
              onSuccess: (result) => {
                console.log('✅ Post page: Conversion successful:', result);
                console.log('🖼️ Artwork URL:', result.metadata?.artwork);
                
                // If we have a postId, navigate to the postId URL
                if (result.postId) {
                  console.log('🔄 Navigating to postId URL:', result.postId);
                  router.replace(`/post?id=${result.postId}`);
                  return;
                }
                
                setPostData(result);
                
                // Extract dominant color from image
                if (result.metadata?.artwork) {
                  extractColorFromArtwork(result.metadata.artwork);
                }
              },
              onError: (err) => {
                console.error('❌ Post page: Conversion failed:', err);
                setError(err instanceof Error ? err.message : 'Failed to convert link');
              },
            });
          } catch (err) {
            console.error('Error decoding URL:', err);
            setError('Invalid URL format');
          }
        } else if (dataParam) {
          // Legacy flow: data passed directly
          const parsedData = JSON.parse(decodeURIComponent(dataParam));
          setPostData(parsedData);
          console.log('🖼️ Legacy artwork URL:', parsedData.metadata?.artwork);
          
          // Extract dominant color from image
          if (parsedData.metadata?.artwork) {
            extractColorFromArtwork(parsedData.metadata.artwork);
          }
        } else if (postId) {
          // Fetch by ID flow
          try {
            const response = await apiService.fetchPostById(postId);
            
            // Transform the API response
            console.log('🔍 Raw API response:', response);
            if (response.success && response.details) {
              const transformedData: MusicLinkConversion & { previewUrl?: string; description?: string; username?: string; } = {
                originalUrl: response.originalLink || '',
                convertedUrls: {},
                metadata: {
                  type: (response.elementType?.toLowerCase() === 'track' ? ElementType.TRACK :
                         response.elementType?.toLowerCase() === 'album' ? ElementType.ALBUM :
                         response.elementType?.toLowerCase() === 'artist' ? ElementType.ARTIST :
                         ElementType.PLAYLIST),
                  title: response.details.title || response.details.name || 'Unknown',
                  artist: response.details.artist || '',
                  artwork: response.details.coverArtUrl || response.details.imageUrl || ''
                },
                description: response.caption,
                username: response.username
              };
              
              // Extract platform URLs and artwork - handle different platform key formats
              let fallbackArtwork = '';
              if (response.platforms) {
                Object.entries(response.platforms).forEach(([platform, data]) => {
                  // Check if URL exists and is not empty
                  if (data?.url && data.url.trim() !== '') {
                    // Map platform keys to match the expected convertedUrls structure
                    let platformKey = platform.toLowerCase();
                    if (platformKey === 'applemusic') {
                      platformKey = 'appleMusic';
                    }
                    transformedData.convertedUrls[platformKey as keyof typeof transformedData.convertedUrls] = data.url;
                  }
                  
                  // Collect artwork URLs as fallback
                  if (data?.artworkUrl && !fallbackArtwork) {
                    fallbackArtwork = data.artworkUrl;
                  }
                });
                
                // Extract preview URL - handle both applemusic and appleMusic keys
                transformedData.previewUrl = response.platforms?.spotify?.previewUrl || 
                                           response.platforms?.deezer?.previewUrl || 
                                           response.platforms?.applemusic?.previewUrl ||
                                           response.platforms?.appleMusic?.previewUrl;
              }
              
              // Use fallback artwork if main artwork is empty
              if (!transformedData.metadata.artwork && fallbackArtwork) {
                transformedData.metadata.artwork = fallbackArtwork;
              }
              
              setPostData(transformedData);
              console.log('🖼️ Transformed artwork URL:', transformedData.metadata.artwork);
              console.log('🔗 Transformed convertedUrls:', transformedData.convertedUrls);
              
              // Extract dominant color
              if (transformedData.metadata.artwork) {
                extractColorFromArtwork(transformedData.metadata.artwork);
              }
            } else {
              throw new Error('Invalid response format');
            }
          } catch (err) {
            console.error('Error fetching post by ID:', err);
            setError('Failed to load content');
          }
        } else {
          setError('No data provided');
        }
      } catch (err) {
        console.error('Error loading post data:', err);
        setError('Failed to load content');
      }
    };
    
    loadData();
  }, [searchParams, convertLink, router]);
  
  // Color extraction function
  const extractColorFromArtwork = async (artworkUrl: string) => {
    try {
      console.log('🎨 Extracting color from:', artworkUrl);
      const result = await ColorExtractor.extractDominantColor(artworkUrl);
      console.log('🎨 Extracted color:', result.dominantColor);
      setDominantColor(result.dominantColor);
    } catch (error) {
      console.error('❌ Color extraction failed:', error);
      setDominantColor('#3B82F6'); // Fallback to blue
    }
  };
  
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth > 900);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  // Show skeleton while converting or if no data yet
  if (isConverting || (!postData && !error)) {
    return <EntitySkeleton isDesktop={isDesktop} />;
  }
  
  if (error) {
    return (
      <div className="min-h-screen relative">
        <AnimatedColorBackground color={dominantColor} />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <MainContainer className="text-center p-8">
            <div className="mb-4">
              <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <HeadlineText className="mb-2">Unable to load content</HeadlineText>
            <BodyText className="text-text-secondary mb-6">
              This content may have been removed or the link is invalid
            </BodyText>
            <AnimatedButton
              text="Go Back"
              onClick={() => router.back()}
              height={40}
              width={120}
              initialPos={4}
            />
          </MainContainer>
        </div>
      </div>
    );
  }
  
  const { metadata, convertedUrls } = postData as MusicLinkConversion;
  const isArtist = metadata.type === ElementType.ARTIST;
  
  // Debug logging
  console.log('🎵 Post data:', postData);
  console.log('🎨 Metadata:', metadata);
  console.log('🖼️ Artwork URL at render:', metadata?.artwork);
  
  return (
    <div className="min-h-screen relative">
      {/* Animated Gradient Background */}
      <AnimatedColorBackground color={dominantColor} />
      
      <div className="relative z-10 min-h-screen">
        {/* Header Toolbar - matching Flutter PostHeaderToolbar */}
        <div className="pt-4 pb-6 px-3 relative z-50">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-text-primary hover:opacity-70 transition-opacity relative z-10"
            >
              <Image
                src="/images/ic_back.png"
                alt="Back"
                width={16}
                height={16}
                className="object-contain"
              />
            </button>
            
            <div className="flex items-center gap-3">
              <button className="text-text-primary hover:opacity-70 transition-opacity relative z-10">
                <Image
                  src="/images/ic_share.png"
                  alt="Share"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </button>
            </div>
          </div>
        </div>
        
        {isDesktop ? (
          // Desktop Layout - matching Flutter desktopBody()
          <div className="px-10 max-w-7xl mx-auto pb-6">
            <div className="flex gap-0">
              {/* Left Column - Album Art and Info (flex: 4) */}
              <div className="flex-[4] flex flex-col items-center">
                <UIText className="text-text-primary font-bold mb-6 uppercase tracking-wider text-lg">
                  {isArtist ? 'Artist' : 'Track'}
                </UIText>
                
                {/* Album Art with Shadow - matching Flutter styling */}
                <div className="relative mb-4">
                  <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 bg-black/25 rounded-xl blur-lg" />
                  <Image
                    src={metadata.artwork || '/images/cassette_logo.png'}
                    alt={metadata.title}
                    width={300}
                    height={300}
                    className="relative rounded-xl object-cover shadow-lg"
                    priority
                    onError={(e) => {
                      console.error('❌ Desktop image failed to load:', metadata.artwork);
                      e.currentTarget.src = '/images/cassette_logo.png';
                    }}
                  />
                  
                  {/* Play Button for Tracks - positioned like Flutter */}
                  {!isArtist && (
                    <AudioPreview 
                      previewUrl={postData?.previewUrl}
                      className="absolute -bottom-2.5 -right-2.5"
                    />
                  )}
                </div>
                
                <HeadlineText className="text-2xl font-bold mb-2 text-center max-w-xs overflow-hidden text-ellipsis">
                  {metadata.title}
                </HeadlineText>
                {!isArtist && (
                  <BodyText className="text-lg text-text-secondary text-center max-w-xs overflow-hidden text-ellipsis">
                    {metadata.artist}
                  </BodyText>
                )}
              </div>
              
              {/* Right Column - Links and Description (flex: 5) */}
              <div className="flex-[5] pl-10 pt-16 max-h-[80vh] overflow-hidden">
                <div 
                  className="h-full overflow-y-auto pb-24"
                  style={{
                    maskImage: 'linear-gradient(to bottom, white 0%, white 85%, white 90%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, white 0%, white 85%, white 90%, transparent 100%)'
                  }}
                >
                  <div className="pt-16 pb-24">
                    {/* Description if available */}
                    {postData?.description && (
                      <div className="mb-9 p-4 bg-background rounded-lg border-2 border-text-primary/30">
                        <div className="flex items-start gap-3">
                          <Image
                            src="/images/ic_music.png"
                            alt="User"
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                          <div>
                            <UIText className="font-bold text-text-primary mb-1">
                              {postData?.username || 'User'}
                            </UIText>
                            <BodyText className="text-text-secondary">
                              {postData?.description}
                            </BodyText>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="border-t-2 border-text-primary mb-6" />
                    
                    {/* Streaming Links Container - matching Flutter glass effect */}
                    <div className="p-4 bg-text-primary/5 rounded-2xl border border-text-primary/10 shadow-sm backdrop-blur-sm mb-6 transform scale-115 pt-2">
                      <StreamingLinks 
                        links={convertedUrls}
                        className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                      />
                    </div>
                    
                    {/* Report Problem Button */}
                    <button className="flex items-center gap-2 px-5 py-3 bg-primary/8 text-primary border-2 border-primary rounded-lg hover:bg-primary/20 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Report a Problem</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Mobile Layout - matching Flutter body() with proper container structure
          <div className="px-5 sm:px-10 pb-6">
            <div className="text-center">
              {/* Element Type */}
              <UIText className="text-text-primary font-bold mb-6 uppercase tracking-wider text-lg">
                {isArtist ? 'Artist' : 'Track'}
              </UIText>
              
              {/* Album Art Container */}
              <div className="mb-5">
                
                {/* Album Art with Shadow - matching Flutter styling with responsive sizing */}
                <div className="relative inline-block">
                  <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 bg-black/25 rounded-xl blur-lg" />
                  <Image
                    src={metadata.artwork || '/images/cassette_logo.png'}
                    alt={metadata.title}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="relative rounded-xl object-cover shadow-lg w-[calc(100vw/2.3)] h-[calc(100vw/2.3)] max-w-[200px] max-h-[200px]"
                    priority
                    onError={(e) => {
                      console.error('❌ Mobile image failed to load:', metadata.artwork);
                      e.currentTarget.src = '/images/cassette_logo.png';
                    }}
                  />
                  
                  {/* Play Button for Tracks */}
                  {!isArtist && (
                    <AudioPreview 
                      previewUrl={postData?.previewUrl}
                      className="absolute -bottom-2.5 -right-2.5"
                    />
                  )}
                </div>
              </div>
              
              {/* Title and Artist with proper spacing - matching Flutter */}
              <div className="mb-6">
                <HeadlineText className="text-2xl font-bold mb-2 text-center break-words px-4">
                  {metadata.title}
                </HeadlineText>
                {!isArtist && (
                  <BodyText className="text-lg text-text-secondary text-center break-words px-4">
                    {metadata.artist}
                  </BodyText>
                )}
              </div>
              
              {/* Description if available - matching Flutter styling */}
              {postData?.description && (
                <div className="mb-6 p-4 bg-background rounded-lg border-2 border-text-primary/30 text-left">
                  <div className="flex items-start gap-3">
                    <Image
                      src="/images/ic_music.png"
                      alt="User"
                      width={24}
                      height={24}
                      className="rounded-full flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <UIText className="font-bold text-text-primary text-sm mb-1">
                        {postData?.username || 'User'}
                      </UIText>
                      <BodyText className="text-text-secondary text-sm break-words">
                        {postData?.description}
                      </BodyText>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="border-t-2 border-text-primary mb-6" />
              
              {/* Streaming Links Container - matching Flutter glass effect with proper mobile sizing */}
              <div className="p-4 bg-text-primary/5 rounded-2xl border border-text-primary/10 shadow-sm backdrop-blur-sm mb-6">
                <StreamingLinks 
                  links={convertedUrls}
                  className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                />
              </div>
              
              {/* Report Problem Button */}
              <button className="flex items-center gap-2 px-5 py-3 bg-primary/8 text-primary border-2 border-primary rounded-lg hover:bg-primary/20 transition-colors mx-auto">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Report a Problem</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostPage() {
  return (
    <Suspense fallback={<EntitySkeleton isDesktop={false} />}>
      <PostPageContent />
    </Suspense>
  );
}