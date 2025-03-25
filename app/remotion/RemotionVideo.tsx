import React, { useState, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { VideoComposition } from './VideoComposition';

interface RemotionVideoProps {
  bgMusicUrl?: string;
  duration?: number;
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
  captionPreset?: 'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS' | 'ALL';
  captionAlignment?: 'top' | 'middle' | 'bottom';
  screenRatio?: '1/1' | '16/9' | '9/16' | 'auto';
  strictWordHighlighting?: boolean;
}

export function RemotionVideo({ 
  duration,
  audioUrl, 
  bgMusicUrl,
  videoUrl, 
  images = [], 
  captions = [], 
  captionStyle = 'default',
  captionPreset = 'BASIC',
  captionAlignment = 'bottom',
  screenRatio = '16/9',
  strictWordHighlighting = true
}: RemotionVideoProps) {
  const playerRef = React.useRef<PlayerRef>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 1920, height: 1080 });
  const [aspectRatio, setAspectRatio] = useState(16/9);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isLoading, setIsLoading] = useState(videoUrl ? false : true);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  
  // Debug props in RemotionVideo
  React.useEffect(() => {
    console.log('RemotionVideo received props:', { audioUrl,bgMusicUrl, videoUrl, images, captions, screenRatio, duration });
  }, [audioUrl, bgMusicUrl, videoUrl, images, captions, screenRatio, duration]);

  // Handle player initialization and error recovery
  React.useEffect(() => {
    // Log when player ref is available
    if (playerRef.current) {
      console.log("Player reference is available");
      
      // Use a timeout to attempt playback after component is fully mounted
      const timeoutId = setTimeout(() => {
        try {
          if (playerRef.current) {
            console.log("Attempting to initialize player");
            // Access the player instance directly - this is a simpler approach
            // that doesn't rely on specific API methods
            const playerInstance = playerRef.current;
            console.log("Player instance:", playerInstance);
          }
        } catch (error) {
          console.error("Error during player initialization:", error);
        }
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Apply screenRatio to dimensions when it changes
  useEffect(() => {
    // Only apply manual ratio if no video is provided or if the screenRatio is not 'auto'
    if ( screenRatio !== 'auto') {
      // Type assertion to make TypeScript happy with string comparison
      const ratio = screenRatio as string;
      if (ratio === '16/9') {
        setVideoDimensions({ width: 1920, height: 1080 });
        setAspectRatio(16/9);
        setIsPortrait(false);
      } else if (ratio === '9/16') {
        setVideoDimensions({ width: 1080, height: 1920 });
        setAspectRatio(9/16);
        setIsPortrait(true);
      } else if (ratio === '1/1') {
        setVideoDimensions({ width: 1080, height: 1080 });
        setAspectRatio(1);
        setIsPortrait(false);
      }
    }
  }, [screenRatio]);

  // Get video dimensions and duration when videoUrl changes
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
        
        if (screenRatio === 'auto') {
          setVideoDimensions({ 
            width: width || 1920, 
            height: height || 1080 
          });
          setAspectRatio(ratio || 16/9);
          setIsPortrait(portrait);
        }
        
        // Set the video duration in milliseconds
        setVideoDuration(video.duration * 1000);
        setIsLoading(false);
        
        // Clean up
        video.remove();
      };
      
      video.onerror = () => {
        console.error('Error loading video for dimension detection');
        setIsLoading(false);
        
        // When in auto mode and video fails to load, use a default 16:9 ratio
        // instead of conditionally checking screenRatio which is known to be 'auto' here
        if (screenRatio === 'auto') {
          setVideoDimensions({ width: 1920, height: 1080 });
          setAspectRatio(16/9);
          setIsPortrait(false);
        }
        console.log('Defaulting to 16:9 ratio due to video load error');
        
        // Clean up
        video.remove();
      };
      
      // Set source and load
      video.src = videoUrl;
      document.body.appendChild(video);
    } else {
      // If no video, use dimensions based on screenRatio
      // Type assertion for string comparison
      const ratio = screenRatio as string;
      if (ratio === '16/9') {
        setVideoDimensions({ width: 1920, height: 1080 });
        setAspectRatio(16/9);
        setIsPortrait(false);
      } else if (ratio === '9/16') {
        setVideoDimensions({ width: 1080, height: 1920 });
        setAspectRatio(9/16);
        setIsPortrait(true);
      } else if (ratio === '1/1') {
        setVideoDimensions({ width: 1080, height: 1080 });
        setAspectRatio(1);
        setIsPortrait(false);
      } else {
        // Default to 16:9 for auto without video
        setVideoDimensions({ width: 1920, height: 1080 });
        setAspectRatio(16/9);
        setIsPortrait(false);
      }
      setVideoDuration(null);
      setIsLoading(false);
    }
  }, [videoUrl, screenRatio]);

  // Validate that at least one media source is provided
  if (!audioUrl && !videoUrl) {
    console.error('RemotionVideo requires either audioUrl or videoUrl');
    return <div className="p-4 text-red-500">Error: No media source provided</div>;
  }

  // Calculate duration based on captions, video duration, or use a default
  const durationInFrames = React.useMemo(() => {
    // Default duration (10 seconds at 30fps)
    const defaultDuration = 30 * 10;
    
    // If explicit duration is provided, use it (convert from seconds to frames)
    if (duration !== undefined) {
      console.log('Using explicitly provided duration:', duration);
      return Math.max(1, Math.ceil(duration * 30)); // Ensure minimum of 1 frame
    }
    
    // Duration from captions
    let captionsDuration = 0;
    if (captions && captions.length > 0) {
      const lastCaption = captions[captions.length - 1];
      captionsDuration = Math.ceil((lastCaption.end / 1000) * 30) + 30; // Add 1 second buffer
    }
    
    // Duration from video (convert from ms to frames at 30fps)
    let videoDurationFrames = 0;
    if (videoDuration) {
      videoDurationFrames = Math.ceil((videoDuration / 1000) * 30);
    }
    
    // When both video and captions are present
    if (videoUrl && captions && captions.length > 0) {
      console.log('Using both video and captions for duration:', {
        videoDurationFrames,
        captionsDuration
      });
      
      // Use the longer of the two durations to ensure all content is shown
      return Math.max(1, Math.max(videoDurationFrames, captionsDuration));
    }
    
    // When only video is present
    if (videoDurationFrames > 0) {
      return Math.max(1, videoDurationFrames);
    }
    
    // When only captions are present
    if (captionsDuration > 0) {
      return Math.max(1, captionsDuration);
    }
    
    // Fallback to default
    return defaultDuration;
  }, [captions, videoDuration, videoUrl, duration]);

  // Create a responsive container style based on video orientation
  const containerStyle: React.CSSProperties = isPortrait
    ? {
        width: 'auto',
        height: '100%',
        maxWidth: '100%',
        maxHeight: 'calc(100vh - 4rem)',
        margin: '0 auto',
        aspectRatio: `${aspectRatio}`,
      }
    : {
        width: '100%',
        position: 'relative',
        paddingTop: `${(1 / aspectRatio) * 100}%`,
        overflow: 'hidden',
        maxHeight: 'calc(100vh - 4rem)',
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
    <div className="w-full h-full flex items-center justify-center">
      <div style={containerStyle} className="bg-black rounded-lg overflow-hidden">
        <Player
          ref={playerRef}
          component={VideoComposition}
          inputProps={{
            bgMusicUrl,
            audioUrl,
            videoUrl,
            images,
            captions,
            isPortrait,
            captionPreset,
            captionAlignment,
            screenRatio,
            strictWordHighlighting,
            disableCaptions: captions.length === 0,
            captionAnimation: (captionStyle === 'default' ? 'none' :
                             captionStyle === 'highlightEachWord' ? 'highlight' :
                             captionStyle === 'wordByWord' ? 'word-by-word' :
                             captionStyle === 'highlightSpokenWord' ? 'movie-style' : 
                             'none') as 'none' | 'highlight' | 'fade-in' | 'word-by-word' | 'movie-style',
          }}
          durationInFrames={durationInFrames}
          compositionWidth={videoDimensions.width}
          compositionHeight={videoDimensions.height}
          fps={30}
          style={playerStyle}
          controls={true}
          className="remotion-player"
          errorFallback={({ error }) => {
            console.error('Remotion player error:', error);
            return (
              <div className="flex flex-col items-center justify-center h-full bg-black/5 p-4 text-center">
                <p className="text-red-500 mb-2">Error playing video</p>
                <p className="text-sm text-muted-foreground">{error.message}</p>
                <button 
                  className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            );
          }}
          clickToPlay={true}
        />
      </div>
    </div>
  );
} 