'use client';

import { useSearchParams } from 'next/navigation';
import { useRef, useEffect, useState, Suspense } from 'react';
import { MusicLinkConversion, ElementType } from '@/types';
import { EntitySkeleton } from '@/components/features/entity/entity-skeleton';
import { StreamingLinks } from '@/components/features/entity/streaming-links';
import { PlayPreview } from '@/components/features/entity/play-preview';
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
  const [postData, setPostData] = useState<MusicLinkConversion & { previewUrl?: string; description?: string; username?: string; genres?: string[]; albumName?: string; releaseDate?: string | null; details?: { artists?: Array<{ name: string; role: string; }>; }; } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Animation states
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  
  // Use the conversion mutation
  const { mutate: convertLink, isPending: isConverting } = useMusicLinkConversion();
  
  // Guards against duplicate conversions (React Strict Mode protection)
  const hasConvertedRef = useRef(false);
  const lastUrlRef = useRef<string | null>(null);
  
  useEffect(() => {
    const run = async () => {
      try {
        const urlParam = searchParams.get('url');
        const dataParam = searchParams.get('data');
        const postId = searchParams.get('id');

        // Only run conversion when we actually have a ?url=
        if (urlParam) {
          const decodedUrl = decodeURIComponent(urlParam);

          // Prevent duplicate mutate calls (Strict Mode / re-renders)
          if (hasConvertedRef.current && lastUrlRef.current === decodedUrl) return;
          hasConvertedRef.current = true;
          lastUrlRef.current = decodedUrl;

          convertLink(decodedUrl, {
            onSuccess: (result) => {
              if (result.postId) {
                // replace removes ?url= so this effect won't re-enter conversion
                router.replace(`/post?id=${result.postId}`);
                return;
              }
              setPostData(result);
              if (result.metadata?.artwork) {
                extractColorFromArtwork(result.metadata.artwork);
              }
            },
            onError: (err) => {
              console.error('❌ Post page: Conversion failed:', err);
              setError(err instanceof Error ? err.message : 'Failed to convert link');
            },
          });
          return; // important: don't fall through
        }

        if (dataParam) {
          const parsedData = JSON.parse(decodeURIComponent(dataParam));
          setPostData(parsedData);
          if (parsedData.metadata?.artwork) extractColorFromArtwork(parsedData.metadata.artwork);
          return;
        }

        if (postId) {
          const response = await apiService.fetchPostById(postId);
          
          // Transform the API response
          if (response.success && response.details) {
            const transformedData: MusicLinkConversion & { previewUrl?: string; description?: string; username?: string; genres?: string[]; albumName?: string; releaseDate?: string | null; details?: { artists?: Array<{ name: string; role: string; }>; }; } = {
              originalUrl: response.originalLink || '',
              convertedUrls: {},
              metadata: {
                type: (response.elementType?.toLowerCase() === 'track' ? ElementType.TRACK :
                       response.elementType?.toLowerCase() === 'album' ? ElementType.ALBUM :
                       response.elementType?.toLowerCase() === 'artist' ? ElementType.ARTIST :
                       ElementType.PLAYLIST),
                title: response.details.title || response.details.name || 'Unknown',
                artist: response.details.artist || '',
                artwork: response.details.coverArtUrl || response.details.imageUrl || '',
                duration: response.metadata?.duration || response.details.duration || ''
              },
              description: response.caption,
              username: response.username,
              genres: response.details.genres || response.metadata?.genres || [],
              albumName: response.metadata?.albumName || response.details.album || '',
              releaseDate: response.metadata?.releaseDate || null,
              details: {
                artists: response.details.artists || []
              }
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
              
              // Extract preview URL - prioritize main details.previewUrl, then check platforms
              transformedData.previewUrl = response.details?.previewUrl ||
                                         response.platforms?.spotify?.previewUrl || 
                                         response.platforms?.deezer?.previewUrl || 
                                         response.platforms?.applemusic?.previewUrl ||
                                         response.platforms?.appleMusic?.previewUrl;
            }
            
            // Use fallback artwork if main artwork is empty
            if (!transformedData.metadata.artwork && fallbackArtwork) {
              transformedData.metadata.artwork = fallbackArtwork;
            }
            
            setPostData(transformedData);
            
            // Extract dominant color
            if (transformedData.metadata.artwork) {
              extractColorFromArtwork(transformedData.metadata.artwork);
            }
          } else {
            throw new Error('Invalid response format');
          }
          return;
        }

        setError('No data provided');
      } catch (e) {
        console.error('Error loading post data:', e);
        setError('Failed to load content');
      }
    };

    run();
    // Only depend on searchParams; do NOT depend on convertLink/router to avoid spurious reruns
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  // Color extraction function
  const extractColorFromArtwork = async (artworkUrl: string) => {
    try {
      const result = await ColorExtractor.extractDominantColor(artworkUrl);
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
              <svg className="w-16 h-16 text-danger mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity relative z-10"
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
              <button className="text-foreground hover:opacity-70 transition-opacity relative z-10">
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
          // Desktop Layout - enhanced with better spacing
          <div className="px-8 max-w-7xl mx-auto pb-8">
            <div className="flex gap-12 items-center min-h-[80vh]">
              {/* Left Column - Album Art and Info (flex: 2) */}
              <div className="flex-[2] flex flex-col items-center min-w-0">
                <UIText className="text-foreground font-bold mb-8 uppercase tracking-wider text-lg">
                  {isArtist ? 'Artist' : 'Track'}
                </UIText>
                
                {/* Album Art with Shadow - increased size for desktop */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg" />
                  <Image
                    src={metadata.artwork || '/images/cassette_logo.png'}
                    alt={metadata.title}
                    width={400}
                    height={400}
                    className="relative rounded-xl object-cover shadow-lg"
                    priority
                    onError={(e) => {
                      console.error('❌ Desktop image failed to load:', metadata.artwork);
                      e.currentTarget.src = '/images/cassette_logo.png';
                    }}
                  />
                  
                  {/* Play Preview for Tracks - positioned over artwork */}
                  {!isArtist && postData?.previewUrl && (
                    <div className="absolute -bottom-4 -right-4">
                      <PlayPreview 
                        previewUrl={postData.previewUrl}
                        title={metadata.title}
                        artist={metadata.artist}
                        artwork={metadata.artwork}
                      />
                    </div>
                  )}
                </div>
                
              </div>
              
              {/* Right Column - Links and Description (flex: 3) */}
              <div className="flex-[3] max-h-[75vh] overflow-hidden">
                <div 
                  className="h-full overflow-y-auto pr-4"
                >
                  <div className="space-y-6">
                    {/* Track Information Card */}
                    <div className="p-5 bg-card/40 rounded-xl border border-border/50 backdrop-blur-sm">
                      <div className="space-y-3">
                        {/* Title */}
                        <HeadlineText className="text-xl font-bold text-foreground text-center">
                          {metadata.title}
                        </HeadlineText>
                        
                        {/* Artists with roles */}
                        {!isArtist && (
                          <div className="text-center">
                            <BodyText className="text-base text-muted-foreground">
                              {postData?.details?.artists && postData.details.artists.length > 0 ? (
                                postData.details.artists.map((artist, idx) => (
                                  <span key={idx}>
                                    {artist.name}
                                    {artist.role === 'Featured' && <span className="text-xs"> (feat.)</span>}
                                    {idx < postData.details!.artists!.length - 1 && ', '}
                                  </span>
                                ))
                              ) : (
                                metadata.artist
                              )}
                            </BodyText>
                          </div>
                        )}
                        
                        {/* Separator */}
                        <div className="border-t border-border/30 mx-4" />
                        
                        {/* Metadata - Centered as inline items */}
                        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm">
                          {/* Duration */}
                          {metadata.duration && (
                            <div>
                              <span className="text-muted-foreground">Duration: </span>
                              <span className="font-medium">{metadata.duration}</span>
                            </div>
                          )}
                          
                          {/* Separator between duration and album */}
                          {metadata.duration && postData?.albumName && (
                            <span className="text-muted-foreground">•</span>
                          )}
                          
                          {/* Album */}
                          {postData?.albumName && (
                            <div>
                              <span className="text-muted-foreground">Album: </span>
                              <span className="font-medium">{postData.albumName}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Genres */}
                        {(() => {
                          const filteredGenres = postData?.genres?.filter(genre => 
                            genre.toLowerCase() !== 'music'
                          ) || [];
                          
                          if (filteredGenres.length === 0) return null;
                          
                          return (
                            <>
                              <div className="border-t border-border/30 mx-4" />
                              <div className="flex flex-wrap gap-2 justify-center">
                                {filteredGenres.map((genre, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted/30 text-muted-foreground border border-border/50"
                                  >
                                    {genre}
                                  </span>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Description if available */}
                    {postData?.description && (
                      <div className="p-5 bg-card rounded-lg border border-border shadow-sm">
                        <div className="flex items-start gap-4">
                          <Image
                            src="/images/ic_music.png"
                            alt="User"
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                          <div className="min-w-0 flex-1">
                            <UIText className="font-bold text-card-foreground mb-2">
                              {postData?.username || 'User'}
                            </UIText>
                            <BodyText className="text-muted-foreground leading-relaxed">
                              {postData?.description}
                            </BodyText>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Streaming Links Container - enhanced styling */}
                    <div className="p-5 bg-card/50 rounded-2xl border border-border shadow-sm backdrop-blur-sm relative z-10">
                      <h3 className="text-lg font-semibold text-card-foreground mb-4">Listen Now</h3>
                      <StreamingLinks 
                        links={convertedUrls}
                        className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                      />
                    </div>
                    
                    {/* Report Problem Button - Desktop */}
                    <div className="flex justify-center">
                      <button className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium relative z-10">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Report a Problem</span>
                      </button>
                    </div>
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
              <UIText className="text-foreground font-bold mb-6 uppercase tracking-wider text-lg">
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
                  
                  {/* Play Preview for Tracks - positioned over artwork */}
                  {!isArtist && postData?.previewUrl && (
                    <div className="absolute -bottom-4 -right-2">
                      <PlayPreview 
                        previewUrl={postData.previewUrl}
                        title={metadata.title}
                        artist={metadata.artist}
                        artwork={metadata.artwork}
                        mobile={true}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Track Information Card - Mobile */}
              <div className="mb-6 p-4 bg-card/40 rounded-xl border border-border/50 backdrop-blur-sm">
                <div className="space-y-3">
                  {/* Title */}
                  <HeadlineText className="text-xl font-bold text-foreground text-center">
                    {metadata.title}
                  </HeadlineText>
                  
                  {/* Artists with roles */}
                  {!isArtist && (
                    <div className="text-center">
                      <BodyText className="text-sm text-muted-foreground">
                        {postData?.details?.artists && postData.details.artists.length > 0 ? (
                          postData.details.artists.map((artist, idx) => (
                            <span key={idx}>
                              {artist.name}
                              {artist.role === 'Featured' && <span className="text-xs"> (feat.)</span>}
                              {idx < postData.details!.artists!.length - 1 && ', '}
                            </span>
                          ))
                        ) : (
                          metadata.artist
                        )}
                      </BodyText>
                    </div>
                  )}
                  
                  {/* Separator */}
                  <div className="border-t border-border/30" />
                  
                  {/* Metadata */}
                  <div className="space-y-2 text-xs">
                    {/* Duration and Album in one line */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {postData?.metadata?.duration && (
                        <div>
                          <span className="text-muted-foreground">Duration: </span>
                          <span className="font-medium">{postData.metadata.duration}</span>
                        </div>
                      )}
                      
                      {postData?.metadata?.duration && postData?.albumName && (
                        <span className="text-muted-foreground">•</span>
                      )}
                      
                      {postData?.albumName && (
                        <div>
                          <span className="text-muted-foreground">Album: </span>
                          <span className="font-medium">{postData.albumName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Genres */}
                  {(() => {
                    const filteredGenres = postData?.genres?.filter(genre => 
                      genre.toLowerCase() !== 'music'
                    ) || [];
                    
                    if (filteredGenres.length === 0) return null;
                    
                    return (
                      <>
                        <div className="border-t border-border/30" />
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {filteredGenres.map((genre, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted/30 text-muted-foreground border border-border/50"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
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
              
              <div className="border-t border-border mb-6" />
              
              {/* Streaming Links Container - matching desktop glass effect */}
              <div className="p-4 bg-card/50 rounded-2xl border border-border shadow-sm backdrop-blur-sm mb-6 relative z-10">
                <StreamingLinks 
                  links={convertedUrls}
                  className="!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-none"
                />
              </div>
              
              {/* Report Problem Button */}
              <button className="flex items-center gap-2 px-5 py-3 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors mx-auto font-medium relative z-50">
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