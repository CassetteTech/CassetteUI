import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { theme } from '../../theme';

interface TypewriterTextProps {
  text: string;
  startFrame?: number;
  framesPerChar?: number;
  style?: React.CSSProperties;
  showCursor?: boolean;
  cursorColor?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame = 0,
  framesPerChar = 2,
  style = {},
  showCursor = true,
  cursorColor = theme.colors.brandRed,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - startFrame;

  // Calculate how many characters to show
  const totalFrames = text.length * framesPerChar;
  const charCount = Math.floor(
    interpolate(
      adjustedFrame,
      [0, totalFrames],
      [0, text.length],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    )
  );

  const displayText = text.slice(0, charCount);
  const isTyping = adjustedFrame >= 0 && adjustedFrame <= totalFrames;
  const isComplete = adjustedFrame > totalFrames;

  // Cursor blink (every 15 frames)
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;

  return (
    <span style={{ ...style, display: 'inline-flex', alignItems: 'center' }}>
      {displayText}
      {showCursor && (isTyping || (isComplete && cursorVisible)) && (
        <span
          style={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            backgroundColor: cursorColor,
            marginLeft: 2,
            opacity: isComplete && !cursorVisible ? 0 : 1,
          }}
        />
      )}
    </span>
  );
};
