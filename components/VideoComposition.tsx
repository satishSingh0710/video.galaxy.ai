import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
import { Download } from 'lucide-react';

interface VideoCompositionProps {
  audioUrl: string;
  images: Array<{
    imageUrl: string;
    contextText: string;
  }>;
  captions: Array<{
    text: string;
    start: number; // in milliseconds
    end: number;   // in milliseconds
    _id?: string;
  }>;
  onDownload?: () => void;
}

// Define a type for caption groups
interface CaptionGroup {
  text: string;
  start: number;
  end: number;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  audioUrl,
  images,
  captions,
  onDownload,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Calculate the current time in milliseconds with more precision
  const currentTimeInMs = Math.floor((frame / fps) * 1000);

  // Constants for timing adjustments
  const TIMING_OFFSET = 400; // Reduced from 800ms for better sync
  const DISPLAY_BUFFER = 200; // Reduced buffer for tighter timing
  const MIN_DISPLAY_TIME = 800; // Minimum time to display each caption
  const PAUSE_THRESHOLD = 300; // Reduced from 500ms for more responsive grouping

  // Debug timing issues
  React.useEffect(() => {
    if (frame % 30 === 0) { // Log every second
      console.log('Current time (ms):', currentTimeInMs);
      const activeCaption = captions.find(
        caption => currentTimeInMs >= caption.start && currentTimeInMs <= caption.end
      );
      console.log('Active caption:', activeCaption);
    }
  }, [frame, currentTimeInMs, captions]);

  // Pre-process captions with refined timing adjustment
  const adjustedCaptions = useMemo(() => {
    return captions.map(caption => {
      const duration = caption.end - caption.start;
      const adjustedDuration = Math.max(duration, MIN_DISPLAY_TIME);
      
      return {
        ...caption,
        adjustedStart: caption.start - TIMING_OFFSET,
        adjustedEnd: caption.start - TIMING_OFFSET + adjustedDuration
      };
    });
  }, [captions]);

  // Group captions into 3-4 word chunks with improved timing
  const captionGroups = useMemo(() => {
    if (!adjustedCaptions || adjustedCaptions.length === 0) return [];
    
    const groups: CaptionGroup[] = [];
    let currentGroup: typeof adjustedCaptions = [];
    let groupStartTime = 0;
    let groupEndTime = 0;
    let wordCount = 0;
    
    adjustedCaptions.forEach((caption, index) => {
      const words = caption.text.trim().split(/\s+/);
      const newWordCount = wordCount + words.length;
      
      const isFirstCaption = index === 0;
      const wouldExceedLimit = newWordCount > 4;
      const hasSignificantPause = caption.adjustedStart > groupEndTime + PAUSE_THRESHOLD;
      const isLastWord = index === adjustedCaptions.length - 1;
      
      if (isFirstCaption || wouldExceedLimit || hasSignificantPause) {
        if (currentGroup.length > 0) {
          const duration = groupEndTime - groupStartTime;
          const adjustedDuration = Math.max(duration, MIN_DISPLAY_TIME);
          
          groups.push({
            text: currentGroup.map(c => c.text).join(' '),
            start: groupStartTime,
            end: groupStartTime + adjustedDuration
          });
        }
        
        currentGroup = [caption];
        groupStartTime = caption.adjustedStart;
        groupEndTime = caption.adjustedEnd;
        wordCount = words.length;
      } else {
        currentGroup.push(caption);
        groupEndTime = caption.adjustedEnd;
        wordCount = newWordCount;
      }

      // Handle the last group
      if (isLastWord && currentGroup.length > 0) {
        const duration = groupEndTime - groupStartTime;
        const adjustedDuration = Math.max(duration, MIN_DISPLAY_TIME);
        
        groups.push({
          text: currentGroup.map(c => c.text).join(' '),
          start: groupStartTime,
          end: groupStartTime + adjustedDuration
        });
      }
    });
    
    return groups;
  }, [adjustedCaptions]);

  // Find current caption group with precise timing
  const currentGroup = captionGroups.find(
    group => currentTimeInMs >= group.start && 
             currentTimeInMs <= group.end + DISPLAY_BUFFER
  );

  // Calculate which image to show based on time
  const segmentDuration = durationInFrames / (images.length || 1);
  const currentImageIndex = Math.floor(frame / segmentDuration);
  const currentImage = images[Math.min(currentImageIndex, images.length - 1)];

  // Animation for image transitions
  const progress = spring({
    frame: frame % segmentDuration,
    fps,
    config: {
      damping: 200,
    },
  });

  const scale = interpolate(progress, [0, 1], [1.1, 1]);
  const opacity = interpolate(progress, [0, 0.2], [0, 1]);

  // Faster, more responsive animation for captions
  const groupAnimation = currentGroup
    ? spring({
        frame: frame - Math.floor((currentGroup.start / 1000) * fps),
        fps,
        config: { 
          damping: 80,  // Reduced damping for faster response
          mass: 0.8,    // Reduced mass for quicker movement
          stiffness: 120 // Increased stiffness for snappier animation
        }
      })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Background Image */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        {currentImage && (
          <img
            src={currentImage.imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            alt={currentImage.contextText}
          />
        )}
      </AbsoluteFill>

      {/* Social Media Style Captions - Centered */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 40px',
          zIndex: 1000,
        }}
      >
        {/* Current caption group */}
        {currentGroup && (
          <div
            style={{
              position: 'relative',
              maxWidth: '90%',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: '25px 35px',
              borderRadius: '20px',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
              transform: `scale(${interpolate(groupAnimation, [0, 1], [0.95, 1])})`,
              opacity: groupAnimation,
              transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
            }}
          >
            <p
              style={{
                color: 'white',
                fontSize: '3.5rem',
                fontWeight: 'bold',
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.4,
                letterSpacing: '0.01em',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {currentGroup.text}
            </p>
          </div>
        )}
      </AbsoluteFill>

      {/* Download Button */}
      {onDownload && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 2000,
          }}
        >
          <button
            onClick={onDownload}
            style={{
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s ease, background-color 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.backgroundColor = '#2563EB';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = '#3B82F6';
            }}
          >
            <Download size={24} />
          </button>
        </div>
      )}

      {/* Audio Track */}
      <Audio src={audioUrl} />
    </AbsoluteFill>
  );
}; 