import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { PremiumBackground } from './components/PremiumBackground';
import { AnimatedLogo } from './components/AnimatedLogo';
import { UrlBarScene } from './components/UrlBarScene';
import { PlaylistConversionScene } from './components/PlaylistConversionScene';
import { PlaylistPostScene } from './components/PlaylistPostScene';
import { ProfileMockup } from './components/ProfileMockup';
import { CTAOutro } from './components/CTAOutro';
import { theme } from './theme';

/*
 * Cassette Marketing Video Composition
 *
 * Structure (45 seconds @ 30fps = 1350 frames):
 * - Scene 1: Hero Intro (0-120 frames, 0-4s)
 * - Scene 2: Playlist URL Input (120-300 frames, 4-10s)
 * - Scene 3: Playlist Conversion (300-630 frames, 10-21s) - Track matching
 * - Scene 4: Playlist Post (630-870 frames, 21-29s) - Show converted playlist
 * - Scene 5: Profile Showcase (870-1140 frames, 29-38s) - Show on profile
 * - Scene 6: CTA Outro (1140-1350 frames, 38-45s)
 */

// Scene timing configuration
const SCENES = {
  hero: { start: 0, duration: 120 },
  urlInput: { start: 120, duration: 180 },
  conversion: { start: 300, duration: 330 },
  playlistPost: { start: 630, duration: 240 },
  profile: { start: 870, duration: 270 },
  cta: { start: 1140, duration: 210 },
} as const;

// Cross-fade transition component
const SceneTransition: React.FC<{
  children: React.ReactNode;
  fadeInDuration?: number;
  fadeOutStart?: number;
  fadeOutDuration?: number;
  noFadeOut?: boolean;
}> = ({
  children,
  fadeInDuration = 15,
  fadeOutStart,
  fadeOutDuration = 15,
  noFadeOut = false,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in
  const fadeInOpacity = interpolate(
    frame,
    [0, Math.max(1, fadeInDuration)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Fade out (skip if noFadeOut is true or duration is 0)
  let fadeOutOpacity = 1;
  if (!noFadeOut && fadeOutDuration > 0) {
    const effectiveFadeOutStart = fadeOutStart ?? (durationInFrames - fadeOutDuration);
    fadeOutOpacity = interpolate(
      frame,
      [effectiveFadeOutStart, effectiveFadeOutStart + fadeOutDuration],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }

  const opacity = Math.min(fadeInOpacity, fadeOutOpacity);

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

export const MarketingVideo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bgCanvas,
      }}
    >
      {/* Premium Background - clean gradient with ambient glow, no floating shapes */}
      <PremiumBackground fadeIn={true} showAmbientGlow={true} />

      {/* Scene 1: Hero Intro */}
      <Sequence from={SCENES.hero.start} durationInFrames={SCENES.hero.duration}>
        <SceneTransition fadeOutStart={SCENES.hero.duration - 20}>
          <AbsoluteFill
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AnimatedLogo
              showTagline={true}
              tagline="Share your playlists everywhere"
              delay={15}
              size="large"
            />
          </AbsoluteFill>
        </SceneTransition>
      </Sequence>

      {/* Scene 2: URL Input Demo */}
      <Sequence from={SCENES.urlInput.start} durationInFrames={SCENES.urlInput.duration}>
        <SceneTransition fadeOutStart={SCENES.urlInput.duration - 20}>
          <UrlBarScene startFrame={0} />
        </SceneTransition>
      </Sequence>

      {/* Scene 3: Playlist Conversion - Track Matching */}
      <Sequence from={SCENES.conversion.start} durationInFrames={SCENES.conversion.duration}>
        <SceneTransition fadeOutStart={SCENES.conversion.duration - 20}>
          <PlaylistConversionScene startFrame={0} />
        </SceneTransition>
      </Sequence>

      {/* Scene 4: Playlist Post - Show Converted Playlist */}
      <Sequence from={SCENES.playlistPost.start} durationInFrames={SCENES.playlistPost.duration}>
        <SceneTransition fadeOutStart={SCENES.playlistPost.duration - 20}>
          <PlaylistPostScene startFrame={0} />
        </SceneTransition>
      </Sequence>

      {/* Scene 5: Profile Showcase - Show on Profile */}
      <Sequence from={SCENES.profile.start} durationInFrames={SCENES.profile.duration}>
        <SceneTransition fadeOutStart={SCENES.profile.duration - 20}>
          <ProfileMockup startFrame={0} />
        </SceneTransition>
      </Sequence>

      {/* Scene 6: CTA Outro */}
      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <SceneTransition noFadeOut>
          <CTAOutro startFrame={0} />
        </SceneTransition>
      </Sequence>
    </AbsoluteFill>
  );
};
