import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';
import { theme } from '../theme';

interface ProfileMockupProps {
  startFrame?: number;
}

// Demo data matching the actual app
const dummyUser = {
  username: 'matttoppi',
  displayName: 'Matt Toppi',
  bio: 'Music enthusiast | Playlist curator',
};

const dummyPlaylists = [
  { id: 1, title: 'Summer Vibes 2024', tracks: 47, color: '#FF6B6B', isNew: true },
  { id: 2, title: 'Chill Study', tracks: 40, color: '#4ECDC4', isNew: false },
  { id: 3, title: 'Workout Mix', tracks: 35, color: '#FFE66D', isNew: false },
  { id: 4, title: 'Late Night Jazz', tracks: 20, color: '#95E1D3', isNew: false },
];

// Tracks and Artists data removed - showing Playlists tab only in this video

// Phone dimensions
const PHONE_WIDTH = 340;
const PHONE_HEIGHT = 680;
const SCREEN_PADDING = 10;
const BEZEL_RADIUS = 44;
const SCREEN_RADIUS = 36;

// Calculate actual element positions relative to phone container
const PHONE_CENTER_X = PHONE_WIDTH / 2;
const HEADER_TOP = 36; // notch space
const PROFILE_PADDING = 14;
const AVATAR_SIZE = 44;
const AVATAR_ROW_HEIGHT = AVATAR_SIZE + 10;
const BIO_HEIGHT = 24;
const SERVICES_HEIGHT = 28;
const BUTTONS_Y = HEADER_TOP + PROFILE_PADDING + AVATAR_ROW_HEIGHT + BIO_HEIGHT + SERVICES_HEIGHT;
const BUTTON_HEIGHT = 30;
const TABS_Y = BUTTONS_Y + BUTTON_HEIGHT + 20;

// Tab component
const TabButton: React.FC<{
  label: string;
  isActive: boolean;
}> = ({ label, isActive }) => (
  <div
    style={{
      flex: 1,
      height: 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isActive ? theme.colors.brandRed : 'transparent',
      borderRadius: 5,
    }}
  >
    <span
      style={{
        fontFamily: theme.fonts.atkinson,
        fontSize: 10,
        fontWeight: theme.fontWeights.medium,
        color: isActive ? theme.colors.white : theme.colors.gray500,
      }}
    >
      {label}
    </span>
  </div>
);

// Curved arrow with animated drawing
const CurvedArrow: React.FC<{
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  frame: number;
  fps: number;
  direction: 'left' | 'right';
}> = ({ startX, startY, endX, endY, delay, frame, fps, direction }) => {
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 60 },
  });

  // Control point for the curve
  const midX = (startX + endX) / 2;
  const curveOffset = direction === 'left' ? -40 : 40;

  const pathD = `M ${startX} ${startY} Q ${midX + curveOffset} ${startY} ${endX} ${endY}`;

  // Arrow head
  const arrowSize = 8;
  const arrowAngle = direction === 'left' ? Math.PI : 0;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {/* Arrow path */}
      <path
        d={pathD}
        fill="none"
        stroke={theme.colors.brandRed}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={300}
        strokeDashoffset={interpolate(progress, [0, 1], [300, 0])}
        style={{ opacity: interpolate(progress, [0, 0.1], [0, 1], { extrapolateRight: 'clamp' }) }}
      />
      {/* Arrow head */}
      <polygon
        points={`
          ${endX},${endY}
          ${endX + (direction === 'left' ? arrowSize : -arrowSize)},${endY - arrowSize/2}
          ${endX + (direction === 'left' ? arrowSize : -arrowSize)},${endY + arrowSize/2}
        `}
        fill={theme.colors.brandRed}
        style={{
          opacity: interpolate(progress, [0.8, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      />
    </svg>
  );
};

// Callout box component
const CalloutBox: React.FC<{
  text: string;
  subtext?: string;
  x: number;
  y: number;
  delay: number;
  frame: number;
  fps: number;
  align?: 'left' | 'right';
}> = ({ text, subtext, x, y, delay, frame, fps, align = 'left' }) => {
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 80 },
  });

  const opacity = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });
  const translateY = interpolate(progress, [0, 1], [20, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translateY(${translateY}px) translateX(${align === 'right' ? '-100%' : '0'})`,
        opacity,
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        padding: '14px 20px',
        border: `2px solid ${theme.colors.brandBlack}`,
        boxShadow: `4px 4px 0px 0px ${theme.colors.brandBlack}`,
        maxWidth: 220,
      }}
    >
      <span
        style={{
          fontFamily: theme.fonts.atkinson,
          fontSize: 15,
          fontWeight: theme.fontWeights.bold,
          color: theme.colors.brandBlack,
          display: 'block',
          lineHeight: 1.3,
        }}
      >
        {text}
      </span>
      {subtext && (
        <span
          style={{
            fontFamily: theme.fonts.atkinson,
            fontSize: 12,
            color: theme.colors.gray600,
            display: 'block',
            marginTop: 4,
          }}
        >
          {subtext}
        </span>
      )}
    </div>
  );
};

export const ProfileMockup: React.FC<ProfileMockupProps> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const adjustedFrame = frame - startFrame;

  // Phone slide in animation
  const phoneEntrance = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 200, stiffness: 60, mass: 1 },
  });

  const phoneX = interpolate(phoneEntrance, [0, 1], [400, 0]);
  const phoneOpacity = interpolate(phoneEntrance, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

  // Keep Playlists tab active (no switching) to showcase converted playlist
  const currentTab = 0;

  const tabs = ['Playlists', 'Tracks', 'Artists'];

  // Content entrance delay
  const contentDelay = 50;

  // Position calculations for the phone in the layout
  // Phone is centered horizontally, so phone left edge is at (width - PHONE_WIDTH) / 2
  const phoneCenterX = width / 2;
  const phoneLeftX = phoneCenterX - PHONE_WIDTH / 2;
  const phoneRightX = phoneCenterX + PHONE_WIDTH / 2;
  const phoneCenterY = height / 2;
  const phoneTopY = phoneCenterY - PHONE_HEIGHT / 2;

  // Calculate actual button positions on screen
  const shareButtonX = phoneRightX - SCREEN_PADDING - PROFILE_PADDING - (PHONE_WIDTH - SCREEN_PADDING * 2 - PROFILE_PADDING * 2) / 4;
  const buttonsScreenY = phoneTopY + SCREEN_PADDING + BUTTONS_Y + BUTTON_HEIGHT / 2;

  const contentScreenY = phoneTopY + SCREEN_PADDING + TABS_Y + 80;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Section title */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: interpolate(adjustedFrame, [0, 30], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <h2
          style={{
            fontFamily: theme.fonts.teko,
            fontSize: 52,
            fontWeight: theme.fontWeights.bold,
            color: theme.colors.white,
            margin: 0,
            letterSpacing: 2,
          }}
        >
          YOUR PLAYLIST IS READY
        </h2>
        <p
          style={{
            fontFamily: theme.fonts.atkinson,
            fontSize: 22,
            color: theme.colors.gray400,
            margin: '8px 0 0 0',
          }}
        >
          Added to your profile instantly
        </p>
      </div>

      {/* Main container for phone + callouts */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Callout 1: Your converted playlist (left side, pointing to first playlist) */}
        <CalloutBox
          text="Your converted playlist"
          subtext="47 tracks matched and ready"
          x={phoneLeftX - 280}
          y={contentScreenY + 40}
          delay={80}
          frame={adjustedFrame}
          fps={fps}
        />

        {/* Arrow to first playlist */}
        <CurvedArrow
          startX={phoneLeftX - 60}
          startY={contentScreenY + 60}
          endX={phoneLeftX + SCREEN_PADDING + 50}
          endY={contentScreenY + 60}
          delay={90}
          frame={adjustedFrame}
          fps={fps}
          direction="left"
        />

        {/* Callout 2: Share with friends (right side) */}
        <CalloutBox
          text="Share with friends"
          subtext="One smart link works everywhere"
          x={phoneRightX + 60}
          y={buttonsScreenY - 30}
          delay={140}
          frame={adjustedFrame}
          fps={fps}
        />

        {/* Arrow to Share button */}
        <CurvedArrow
          startX={phoneRightX + 60}
          startY={buttonsScreenY}
          endX={shareButtonX - 20}
          endY={buttonsScreenY}
          delay={150}
          frame={adjustedFrame}
          fps={fps}
          direction="right"
        />

        {/* Phone container */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translateX(${phoneX}px)`,
            opacity: phoneOpacity,
          }}
        >
          {/* Phone Body */}
          <div
            style={{
              width: PHONE_WIDTH,
              height: PHONE_HEIGHT,
              backgroundColor: theme.colors.brandBlack,
              borderRadius: BEZEL_RADIUS,
              padding: SCREEN_PADDING,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Screen */}
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: theme.colors.brandCream,
                borderRadius: SCREEN_RADIUS,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Notch */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 100,
                  height: 24,
                  backgroundColor: theme.colors.brandBlack,
                  borderBottomLeftRadius: 14,
                  borderBottomRightRadius: 14,
                  zIndex: 10,
                }}
              />

              {/* Screen Content */}
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  paddingTop: HEADER_TOP,
                }}
              >
                {/* Profile Header */}
                <div style={{ padding: PROFILE_PADDING }}>
                  {/* Avatar and name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div
                      style={{
                        width: AVATAR_SIZE,
                        height: AVATAR_SIZE,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${theme.colors.brandRed} 0%, ${theme.colors.brandRedL} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ color: theme.colors.white, fontFamily: theme.fonts.teko, fontSize: 20, fontWeight: theme.fontWeights.bold }}>
                        MT
                      </span>
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: theme.fonts.atkinson,
                          fontSize: 13,
                          fontWeight: theme.fontWeights.bold,
                          color: theme.colors.brandBlack,
                        }}
                      >
                        {dummyUser.displayName}
                      </div>
                      <div
                        style={{
                          fontFamily: theme.fonts.atkinson,
                          fontSize: 10,
                          color: theme.colors.gray500,
                        }}
                      >
                        @{dummyUser.username}
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div
                    style={{
                      fontFamily: theme.fonts.atkinson,
                      fontSize: 10,
                      color: theme.colors.brandBlack,
                      marginBottom: 10,
                      lineHeight: 1.4,
                    }}
                  >
                    {dummyUser.bio}
                  </div>

                  {/* Connected services */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {['spotify', 'apple_music', 'deezer'].map((service) => (
                      <div key={service} style={{ width: 18, height: 18 }}>
                        <Img
                          src={staticFile(`images/${service}_logo_colored.png`)}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Action buttons - these are what the arrows point to */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div
                      style={{
                        flex: 1,
                        height: BUTTON_HEIGHT,
                        borderRadius: 6,
                        border: `1.5px solid ${theme.colors.gray400}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.colors.white,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: theme.fonts.atkinson,
                          fontSize: 10,
                          fontWeight: theme.fontWeights.semibold,
                          color: theme.colors.brandBlack,
                        }}
                      >
                        + Add Music
                      </span>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: BUTTON_HEIGHT,
                        borderRadius: 6,
                        backgroundColor: theme.colors.brandRed,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 2px 4px ${theme.colors.brandRed}40`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: theme.fonts.atkinson,
                          fontSize: 10,
                          fontWeight: theme.fontWeights.semibold,
                          color: theme.colors.white,
                        }}
                      >
                        Share Profile
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div
                  style={{
                    padding: `0 ${PROFILE_PADDING}px`,
                    borderTop: `1px solid ${theme.colors.gray200}`,
                    paddingTop: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      backgroundColor: theme.colors.gray100,
                      borderRadius: 6,
                      padding: 3,
                    }}
                  >
                    {tabs.map((tab, i) => (
                      <TabButton key={tab} label={tab} isActive={currentTab === i} />
                    ))}
                  </div>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, padding: PROFILE_PADDING, overflow: 'hidden' }}>
                  {/* Playlists Grid */}
                  {currentTab === 0 && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 10,
                      }}
                    >
                      {dummyPlaylists.map((playlist, i) => {
                        const itemScale = spring({
                          frame: adjustedFrame - contentDelay - i * 6,
                          fps,
                          config: { damping: 200, stiffness: 100 },
                        });

                        return (
                          <div
                            key={playlist.id}
                            style={{
                              transform: `scale(${itemScale})`,
                              opacity: interpolate(itemScale, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                            }}
                          >
                            <div
                              style={{
                                position: 'relative',
                                width: '100%',
                                aspectRatio: '1',
                                borderRadius: 8,
                                backgroundColor: playlist.color,
                                boxShadow: theme.shadows.soft,
                              }}
                            >
                              {/* NEW badge for converted playlist */}
                              {playlist.isNew && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 4,
                                    right: 4,
                                    backgroundColor: theme.colors.brandRed,
                                    color: theme.colors.white,
                                    fontFamily: theme.fonts.teko,
                                    fontSize: 8,
                                    fontWeight: theme.fontWeights.bold,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  NEW
                                </div>
                              )}
                            </div>
                            <div
                              style={{
                                marginTop: 5,
                                fontFamily: theme.fonts.atkinson,
                                fontSize: 9,
                                fontWeight: theme.fontWeights.medium,
                                color: theme.colors.brandBlack,
                              }}
                            >
                              {playlist.title}
                            </div>
                            <div
                              style={{
                                fontFamily: theme.fonts.atkinson,
                                fontSize: 8,
                                color: theme.colors.gray500,
                              }}
                            >
                              {playlist.tracks} tracks
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Only showing Playlists tab - Tracks and Artists tabs removed for this video */}
                </div>
              </div>
            </div>
          </div>

          {/* Side buttons */}
          <div
            style={{
              position: 'absolute',
              right: -3,
              top: 90,
              width: 3,
              height: 40,
              backgroundColor: theme.colors.brandBlack,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: -3,
              top: 145,
              width: 3,
              height: 60,
              backgroundColor: theme.colors.brandBlack,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: -3,
              top: 120,
              width: 3,
              height: 35,
              backgroundColor: theme.colors.brandBlack,
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
};
