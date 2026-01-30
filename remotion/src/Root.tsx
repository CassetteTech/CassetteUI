import React from 'react';
import { Composition, Still } from 'remotion';
import { MarketingVideo } from './MarketingVideo';
import { AnimatedLogo } from './components/AnimatedLogo';
import { UrlBarScene } from './components/UrlBarScene';
import { PlaylistConversionScene } from './components/PlaylistConversionScene';
import { PlaylistPostScene } from './components/PlaylistPostScene';
import { ProfileMockup } from './components/ProfileMockup';
import { CTAOutro } from './components/CTAOutro';
import { PremiumBackground } from './components/PremiumBackground';
import { theme } from './theme';

/*
 * Remotion Root Configuration
 *
 * Main composition: CassetteMarketing (1920x1080, 30fps, 45 seconds)
 *
 * Scene Structure:
 * - Scene 1: Hero Intro (0-120 frames, 0-4s)
 * - Scene 2: Playlist URL Input (120-300 frames, 4-10s)
 * - Scene 3: Playlist Conversion (300-630 frames, 10-21s) - Track matching
 * - Scene 4: Playlist Post (630-870 frames, 21-29s) - Show converted playlist
 * - Scene 5: Profile Showcase (870-1140 frames, 29-38s) - Show on profile
 * - Scene 6: CTA Outro (1140-1350 frames, 38-45s)
 */

// Video dimensions and settings
const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;
const FPS = 30;
const TOTAL_DURATION = 1350; // 45 seconds

// Wrapper for individual scene previews - uses clean PremiumBackground
const ScenePreviewWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.bgCanvas,
      position: 'relative',
    }}
  >
    <PremiumBackground fadeIn={false} showAmbientGlow={true} />
    {children}
  </div>
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Main Marketing Video Composition */}
      <Composition
        id="CassetteMarketing"
        component={MarketingVideo}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      {/* Individual Scene Previews for Development */}
      <Composition
        id="Scene1-HeroIntro"
        component={() => (
          <ScenePreviewWrapper>
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnimatedLogo showTagline={true} tagline="Share your playlists everywhere" delay={15} size="large" />
            </div>
          </ScenePreviewWrapper>
        )}
        durationInFrames={120}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      <Composition
        id="Scene2-PlaylistUrl"
        component={() => (
          <ScenePreviewWrapper>
            <UrlBarScene startFrame={0} />
          </ScenePreviewWrapper>
        )}
        durationInFrames={180}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      <Composition
        id="Scene3-PlaylistConversion"
        component={() => (
          <ScenePreviewWrapper>
            <PlaylistConversionScene startFrame={0} />
          </ScenePreviewWrapper>
        )}
        durationInFrames={330}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      <Composition
        id="Scene4-PlaylistPost"
        component={() => (
          <ScenePreviewWrapper>
            <PlaylistPostScene startFrame={0} />
          </ScenePreviewWrapper>
        )}
        durationInFrames={240}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      <Composition
        id="Scene5-Profile"
        component={() => (
          <ScenePreviewWrapper>
            <ProfileMockup startFrame={0} />
          </ScenePreviewWrapper>
        )}
        durationInFrames={270}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      <Composition
        id="Scene6-CTA"
        component={() => (
          <ScenePreviewWrapper>
            <CTAOutro startFrame={0} />
          </ScenePreviewWrapper>
        )}
        durationInFrames={210}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      {/* Still frame exports for thumbnails */}
      <Still
        id="Thumbnail-Logo"
        component={() => (
          <ScenePreviewWrapper>
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnimatedLogo showTagline={true} delay={0} size="large" />
            </div>
          </ScenePreviewWrapper>
        )}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      <Still
        id="Thumbnail-CTA"
        component={() => (
          <ScenePreviewWrapper>
            <CTAOutro startFrame={0} />
          </ScenePreviewWrapper>
        )}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
    </>
  );
};
