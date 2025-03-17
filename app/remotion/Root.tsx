import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';

// Define interface for component props
interface RemotionRootProps {
  captions?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  disableCaptions?: boolean;
  audioDuration?: number;
}

export const RemotionRoot: React.FC<RemotionRootProps> = ({ 
  captions = [], 
  disableCaptions = false,
  audioDuration = 0
}) => {
  // Calculate duration based on captions, audio duration, or use default of 150
  const calculateDuration = () => {
    // If captions are disabled, use audio duration (converted from seconds to frames)
    if (disableCaptions && audioDuration) {
      // Add a small buffer (1 second) to the end
      return Math.ceil((audioDuration + 1) * 30); // Assuming 30fps
    }
    
    // If captions are enabled but empty, use default
    if (!captions || captions.length === 0) {
      return 150; // Default value when no captions
    }
    
    // Use captions for duration calculation
    const maxEndTime = Math.max(...captions.map(caption => caption.end));
    return Math.ceil((maxEndTime / 1000 + 0.5) * 30); // Convert ms to seconds, add 0.5s buffer, convert to frames
  };

  const durationInFrames = calculateDuration();

  return (
    <>
      <Composition
        id="VideoComposition"
        component={VideoComposition as any}
        durationInFrames={audioDuration * 30 || durationInFrames}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          duration: audioDuration,
          images: [],
          videoUrl: '',
          audioUrl: '',
          captions: captions || [],
          captionPreset: 'BASIC',
          captionAlignment: 'middle',
          isPortrait: false,
          disableCaptions: disableCaptions,
        }}
      />
    </>
  );
}; 