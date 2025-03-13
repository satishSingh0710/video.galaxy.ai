import React, { useState, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { VideoComposition } from './VideoComposition';

interface RemotionVideoProps {
  audioUrl?: string;
  videoUrl?: string;
  images?: Array<{
    imageUrl: string;
    contextText: string;
  }>;
  captions?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  captionStyle?: 'default' | 'highlightEachWord' | 'highlightSpokenWord' | 'wordByWord';
}

export function RemotionVideo({ 
  audioUrl, 
  videoUrl, 
  images = [], 
  captions = [], 
  captionStyle = 'default' 
}: RemotionVideoProps) {
  const playerRef = React.useRef<PlayerRef>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 1920, height: 1080 });
  const [aspectRatio, setAspectRatio] = useState(16/9);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isLoading, setIsLoading] = useState(!!videoUrl);
  
  // Debug props in RemotionVideo
  React.useEffect(() => {
    console.log('RemotionVideo received props:', { audioUrl, videoUrl, images, captions });
  }, [audioUrl, videoUrl, images, captions]);

  // Get video dimensions when videoUrl changes
  useEffect(() => {
    if (videoUrl) {
      setIsLoading(true);
      const video = document.createElement('video');
      video.style.display = 'none';
      
      video.onloadedmetadata = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const ratio = width / height;
        const portrait = height > width;
        
        console.log('Video dimensions detected:', { width, height, ratio, portrait });
        
        setVideoDimensions({ 
          width: width || 1920, 
          height: height || 1080 
        });
        setAspectRatio(ratio || 16/9);
        setIsPortrait(portrait);
        setIsLoading(false);
        
        // Clean up
        video.remove();
      };
      
      video.onerror = () => {
        console.error('Error loading video for dimension detection');
        setIsLoading(false);
        // Use default dimensions
        setVideoDimensions({ width: 1920, height: 1080 });
        setAspectRatio(16/9);
        setIsPortrait(false);
        
        // Clean up
        video.remove();
      };
      
      // Set source and load
      video.src = videoUrl;
      document.body.appendChild(video);
    } else {
      // If no video, use default dimensions for audio
      setVideoDimensions({ width: 1920, height: 1080 });
      setAspectRatio(16/9);
      setIsPortrait(false);
      setIsLoading(false);
    }
  }, [videoUrl]);

  // Validate that at least one media source is provided
  if (!audioUrl && !videoUrl) {
    console.error('RemotionVideo requires either audioUrl or videoUrl');
    return <div className="p-4 text-red-500">Error: No media source provided</div>;
  }

  // Calculate duration based on captions or use a default
  const durationInFrames = React.useMemo(() => {
    if (captions && captions.length > 0) {
      const lastCaption = captions[captions.length - 1];
      // Convert milliseconds to frames (assuming 30fps)
      return Math.ceil((lastCaption.end / 1000) * 30) + 30; // Add 1 second buffer
    }
    return 30 * 60; // Default 60 seconds at 30fps
  }, [captions]);

  // Create a responsive container style based on video orientation
  const containerStyle: React.CSSProperties = isPortrait
    ? {
        width: 'auto',
        height: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        aspectRatio: `${aspectRatio}`,
      }
    : {
        width: '100%',
        position: 'relative',
        paddingTop: `${(1 / aspectRatio) * 100}%`,
        overflow: 'hidden',
      };

  // Player style to fit within the container
  const playerStyle: React.CSSProperties = isPortrait
    ? {
        width: '100%',
        height: '100%',
      }
    : {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/10 rounded-lg">
        <div className="animate-pulse text-center">
          <div className="h-8 w-8 mx-auto border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex items-center justify-center ${isPortrait ? 'portrait-video-container' : ''}`}>
      <div style={containerStyle} className="bg-black rounded-lg overflow-hidden">
        <Player
          ref={playerRef}
          component={VideoComposition}
          inputProps={{
            audioUrl,
            videoUrl,
            images,
            captions,
            captionStyle,
            isPortrait,
          }}
          durationInFrames={durationInFrames}
          compositionWidth={videoDimensions.width}
          compositionHeight={videoDimensions.height}
          fps={30}
          style={playerStyle}
          controls
          autoPlay
        />
      </div>
    </div>
  );
} 