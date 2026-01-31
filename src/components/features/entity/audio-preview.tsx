import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

interface AudioPreviewProps {
  previewUrl?: string;
  className?: string;
}

export const AudioPreview: React.FC<AudioPreviewProps> = ({ previewUrl, className }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    // Cleanup on unmount
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);
  
  const handleTogglePlay = async () => {
    if (!previewUrl || !audioRef.current) {
      // Show message that no preview is available
      console.log('No preview available for this track');
      return;
    }
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        audioRef.current.src = previewUrl;
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };
  
  // Handle audio ended
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };
  
  return (
    <>
      <button
        onClick={handleTogglePlay}
        className={cn(
          "relative group cursor-pointer transition-transform hover:scale-105",
          className
        )}
        aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
      >
        {/* Play button background */}
        <Image
          src="/images/ic_play.png"
          alt=""
          width={56}
          height={56}
          className="w-14 h-14"
        />
        
        {/* Play/Pause icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isLoading ? (
            <Spinner size="md" variant="white" />
          ) : (
            <svg 
              className="w-7 h-7 text-white" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              {isPlaying ? (
                // Pause icon
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              ) : (
                // Play icon
                <path d="M8 5v14l11-7z" />
              )}
            </svg>
          )}
        </div>
        
        {/* Hover effect */}
        <div className="absolute inset-0 rounded-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={(e) => {
          console.error('Audio error:', e);
          setIsPlaying(false);
          setIsLoading(false);
        }}
        preload="none"
      />
    </>
  );
};