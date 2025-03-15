import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Video,
  spring,
  random,
} from 'remotion';

interface VideoCompositionProps {
  audioUrl?: string;
  videoUrl?: string;
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
  isPortrait?: boolean;
  captionPreset?: 'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS' | 'ALL';
  captionAlignment?: 'top' | 'middle' | 'bottom';
  disableCaptions?: boolean;
  screenRatio?: '1/1' | '16/9' | '9/16' | 'auto';
  imageAnimation?: 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'ken-burns' | 'subtle-pulse' | 'random' | 'slow-fullscreen-zoom';
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  audioUrl,
  videoUrl,
  images = [],
  captions = [],
  isPortrait = false,
  captionPreset = 'BASIC',
  captionAlignment = 'middle',
  disableCaptions = false,
  screenRatio = 'auto',
  imageAnimation = 'none',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Calculate aspect ratio container dimensions
  const containerDimensions = useMemo(() => {
    if (screenRatio === 'auto') {
      return { width: '100%', height: '100%' };
    }
    
    let aspectRatio: number;
    switch (screenRatio) {
      case '1/1':
        aspectRatio = 1;
        break;
      case '16/9':
        aspectRatio = 16/9;
        break;
      case '9/16':
        aspectRatio = 9/16;
        break;
      default:
        aspectRatio = isPortrait ? 9/16 : 16/9;
    }
    
    if (width / height > aspectRatio) {
      // Container is wider than desired ratio
      const newWidth = height * aspectRatio;
      return {
        width: newWidth,
        height: height,
        left: (width - newWidth) / 2,
        top: 0,
      };
    } else {
      // Container is taller than desired ratio
      const newHeight = width / aspectRatio;
      return {
        width: width,
        height: newHeight,
        left: 0,
        top: (height - newHeight) / 2,
      };
    }
  }, [width, height, screenRatio, isPortrait]);

  // Calculate current time in milliseconds
  const currentTime = (frame / fps) * 1000;
  
  /**
   * Gets the current caption to display based on the current frame time
   * @returns The current caption or a preview caption if no current caption exists
   */
  const getCurrentCaptions = () => {
    // Return null if captions are disabled
    if (disableCaptions) return null;
    
    // Cache caption groups to ensure stability
    const memoizedCaptionGroups = React.useMemo(() => {
      // Group captions into distinct chunks for display
      const groups: Array<{
        text: string;
        start: number;
        end: number;
        isPreview?: boolean;
        wordCount: number;
        id: string; // Add a stable ID for each group
      }> = [];
      
      if (captions.length === 0) return groups;
      
      // Sort captions by start time
      const sortedCaptions = [...captions].sort((a, b) => a.start - b.start);
      
      // Create caption groups with a maximum of words that would result in 3-4 words per visual group
      let currentGroup: typeof sortedCaptions = [];
      let currentWordCount = 0;
      const MAX_WORDS_PER_GROUP = 4; // This ensures we get around 3 visual groups of 4 words each
      let groupId = 0;
      
      for (const caption of sortedCaptions) {
        // If adding this caption would exceed our word limit, finish the current group
        const captionWordCount = caption.text.split(' ').filter(Boolean).length;
        
        if (currentWordCount + captionWordCount > MAX_WORDS_PER_GROUP && currentGroup.length > 0) {
          // Use the start time of the first caption and end time of the last caption in the group
          const firstCaptionStart = currentGroup[0].start;
          const lastCaptionEnd = Math.max(...currentGroup.map(c => c.end));
          
          // Create a new group with the combined text
          groups.push({
            text: currentGroup.map(c => c.text).join(' '),
            start: firstCaptionStart,
            end: lastCaptionEnd,
            wordCount: currentWordCount,
            id: `group-${groupId++}` // Use a stable ID to prevent re-renders
          });
          
          // Start a new group
          currentGroup = [];
          currentWordCount = 0;
        }
        
        // Add the caption to the current group
        currentGroup.push(caption);
        currentWordCount += captionWordCount;
      }
      
      // Add the final group if there's anything left
      if (currentGroup.length > 0) {
        const firstCaptionStart = currentGroup[0].start;
        const lastCaptionEnd = Math.max(...currentGroup.map(c => c.end));
        
        groups.push({
          text: currentGroup.map(c => c.text).join(' '),
          start: firstCaptionStart,
          end: lastCaptionEnd,
          wordCount: currentWordCount,
          id: `group-${groupId++}`
        });
      }
      
      return groups;
    }, [captions]);
    
    // Find the current caption group based on the current time
    const currentGroup = memoizedCaptionGroups.find(
      group => currentTime >= group.start && currentTime <= group.end
    );
    
    if (currentGroup) {
      return currentGroup;
    }
    
    // If no current group, look for the next upcoming group as a preview
    const nextGroup = memoizedCaptionGroups.find(
      group => currentTime < group.start && group.start <= currentTime + 1000
    );
    
    if (nextGroup) {
      return {
        ...nextGroup,
        isPreview: true,
      };
    }
    
    return null;
  };
  
  // Get the caption to display
  const displayCaption = getCurrentCaptions();
  
  // Add a visual indicator for preview captions
  const isPreviewCaption = displayCaption?.isPreview || false;

  // Debug the current caption
  React.useEffect(() => {
    if (displayCaption) {
      console.log('Current caption group:', displayCaption);
    }
  }, [frame, displayCaption]);

  // Use memo to store the previous caption to enable crossfade
  const [prevCaption, setPrevCaption] = React.useState<typeof displayCaption>(null);
  
  // Track previous and current caption for crossfade effect
  React.useEffect(() => {
    if (displayCaption && (!prevCaption || displayCaption.id !== prevCaption.id)) {
      setPrevCaption(displayCaption);
    }
  }, [displayCaption?.id]);

  // Get caption style based on preset
  const getCaptionStyle = (preset: VideoCompositionProps['captionPreset']) => {
    // Default styles
    const baseStyle = {
      position: 'absolute',
      width: '100%',
      textAlign: 'center',
      fontSize: '3.9rem',
      fontWeight: 600,
      padding: '1rem',
      zIndex: 10,
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '0.5rem',
      maxWidth: '90%',
      margin: '0 auto',
      left: '5%',
      right: '5%',
    } as const;

    // Alignment styles - fixed to avoid duplicate properties
    let alignmentStyle = {};
    if (captionAlignment === 'top') {
      alignmentStyle = { top: '25px' };
    } else if (captionAlignment === 'bottom') {
      alignmentStyle = { bottom: '25px' };
    } else if (captionAlignment === 'middle') {
      alignmentStyle = { top: '50%', transform: 'translateY(-50%)' };
    }

    // Preset-specific styles
    switch (preset) {
      case 'BASIC':
        return {
          ...baseStyle,
          ...alignmentStyle,
          color: 'white',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        };
      case 'REVID':
        return {
          ...baseStyle,
          ...alignmentStyle,
          color: 'white',
          textShadow: '2px 2px 0px #000000',
          letterSpacing: '1px',
        };
      case 'HORMOZI':
        return {
          ...baseStyle,
          ...alignmentStyle,
          color: '#FFFF00',
          textShadow: '2px 2px 0px rgba(0, 0, 0, 0.8)',
          fontWeight: 700,
        };
      case 'WRAP 1':
        return {
          ...baseStyle,
          ...alignmentStyle,
          color: 'white',
          minWidth: '30%', 
          maxWidth: 'min(95%, fit-content)',
          margin: '0 auto',
        };
      case 'WRAP 2':
        return {
          ...baseStyle,
          ...alignmentStyle,
          color: 'white',
          maxWidth: 'min(80%, fit-content)',
          minWidth: '30%',
          margin: '0 auto',
        };
      case 'FACELESS':
        return {
          ...baseStyle,
          ...alignmentStyle,
          color: 'white',
          textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
          letterSpacing: '2px',
          fontWeight: 300,
        };
      case 'ALL':
        return {
          ...baseStyle,
          ...alignmentStyle,
          color: 'white',
          textShadow: '2px 2px 0px rgba(0, 0, 0, 0.8)',
          fontWeight: 700,
        };
      default:
        return {
          ...baseStyle,
          ...alignmentStyle,
          color: 'white',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        };
    }
  };

  // Render the caption text based on selected animation style
  const renderCaptionText = (text: string, captionData: typeof displayCaption) => {
    if (!captionData) return null;
    
    const frameInMs = (frame / fps) * 1000;
    const elapsedTime = frameInMs - captionData.start;
    const captionDuration = captionData.end - captionData.start;

    // Guard against empty or undefined text
    if (!text || text.trim() === '') return null;
    
    // Split the text into words
    const words = text.trim().split(' ').filter(Boolean);
    
    // Set very fast fade in and a bit longer fade out - the key is to limit animations
    const fadeInMs = 80; // ms for fade in - very quick
    const fadeOutMs = 150; // ms for fade out - quick but noticeable
    
    // Create a simple step-based opacity function to reduce jitter
    const getOpacity = () => {
      // For preview captions, use a gentle pulse
      if (captionData.isPreview) {
        return 0.8;
      }
      
      // For normal captions, handle fade in/out
      if (elapsedTime < 0) return 0;
      if (elapsedTime < fadeInMs) return 1; // Remove fade-in to reduce flickering
      if (elapsedTime > captionDuration - fadeOutMs) {
        return Math.max(0, 1 - (elapsedTime - (captionDuration - fadeOutMs)) / fadeOutMs);
      }
      return 1;
    };
    
    // Use a calculated opacity value
    const opacity = getOpacity();
    
    // Get background color based on the preset
    const getBackgroundColor = () => {
      if (captionPreset === 'WRAP 1') {
        return 'rgba(255, 85, 75, 0.9)';
      } else if (captionPreset === 'WRAP 2') {
        return 'rgba(88, 172, 240, 0.9)';
      } else {
        return 'rgba(0, 0, 0, 0.6)';
      }
    };
    
    // If there are fewer than 4 words, just show them all together
    if (words.length <= 4) {
      return (
        <div 
          key={captionData.id} // Use stable ID from caption
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            opacity: opacity,
            // Use hardware acceleration to reduce flickering
            transform: 'translateZ(0)',
            willChange: 'opacity',
          }}
        >
          <span style={{
            display: 'inline-block',
            backgroundColor: getBackgroundColor(),
            padding: captionPreset.includes('WRAP') ? '0.3rem 1rem' : '0.3rem 1rem',
            margin: '0.2rem',
            borderRadius: '4px',
            lineHeight: '1.3',
          }}>
            {words.join(' ')}
          </span>
        </div>
      );
    }
    
    // Group words into chunks of 4 words maximum
    const wordGroups: string[] = [];
    const wordsPerGroup = 4; // Maximum 4 words per group
    
    for (let i = 0; i < words.length; i += wordsPerGroup) {
      const group = words.slice(i, Math.min(i + wordsPerGroup, words.length)).join(' ');
      wordGroups.push(group);
    }
    
    // Style for each word group
    const wordGroupStyle: React.CSSProperties = {
      display: 'inline-block',
      backgroundColor: getBackgroundColor(),
      padding: '0.3rem 1rem',
      margin: '0.2rem',
      borderRadius: '4px',
      lineHeight: '1.3',
      maxWidth: '100%',
      textAlign: 'center',
    };
    
    // Return the styled word groups as JSX
    return (
      <div 
        key={captionData.id} // Use stable ID from caption
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          textAlign: 'center',
          opacity: opacity,
          // Use hardware acceleration to reduce flickering
          transform: 'translateZ(0)',
          willChange: 'opacity',
        }}
      >
        {wordGroups.map((group, index) => (
          <span 
            key={`${captionData.id}-${index}`} 
            style={wordGroupStyle}
          >
            {group}
          </span>
        ))}
      </div>
    );
  };

  // Generate a consistent random value based on the image index for variety in animations
  const getConsistentRandomForImage = (imageIndex: number, min: number, max: number) => {
    return random(imageIndex * 999) * (max - min) + min;
  };

  // Apply animation effects to images
  const applyImageAnimation = (imageIndex: number, progress: number, style: React.CSSProperties): React.CSSProperties => {
    if (imageAnimation === 'none') {
      return style;
    }

    const animationStyle = { ...style };
    
    // Get a consistent random value for this image to ensure the animation doesn't change on re-renders
    const randomSeed = imageIndex;
    
    // Calculate the frame within the current image's duration (resets for each image)
    const secondsPerImage = 5;
    const framesPerImage = secondsPerImage * fps;
    const currentImageStartFrame = Math.floor(frame / framesPerImage) * framesPerImage;
    const frameWithinImage = frame - currentImageStartFrame;
    
    // Different animation effects
    switch (imageAnimation) {
      case 'slow-fullscreen-zoom': {
        // Bell curve zoom: from 1 (original) to 1.2 (max zoom) and back to 1
        const scale = interpolate(
          frameWithinImage,
          [0, framesPerImage / 2, framesPerImage],
          [1, 1.2, 1],  // Scale from 1 (original) to 1.2 (zoomed-in) and back to 1
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        
        // Ensure object-fit is cover to maintain fullscreen appearance
        animationStyle.objectFit = 'cover';
        animationStyle.transform = `${animationStyle.transform || ''} scale(${scale})`;
        break;
      }
      
      case 'zoom-in': {
        const scale = interpolate(progress, [0, 1], [1, 1.15]);
        animationStyle.transform = `${animationStyle.transform || ''} scale(${scale})`;
        break;
      }
      
      case 'zoom-out': {
        const scale = interpolate(progress, [0, 1], [1.15, 1]);
        animationStyle.transform = `${animationStyle.transform || ''} scale(${scale})`;
        break;
      }
      
      case 'pan-left': {
        const translateX = interpolate(progress, [0, 1], [0, -5]);
        animationStyle.transform = `${animationStyle.transform || ''} translateX(${translateX}%)`;
        break;
      }
      
      case 'pan-right': {
        const translateX = interpolate(progress, [0, 1], [0, 5]);
        animationStyle.transform = `${animationStyle.transform || ''} translateX(${translateX}%)`;
        break;
      }
      
      case 'ken-burns': {
        // Ken Burns effect combines zoom and pan with subtle randomization
        const startScale = getConsistentRandomForImage(randomSeed, 1.05, 1.15);
        const endScale = getConsistentRandomForImage(randomSeed + 1, 1.1, 1.2);
        
        const startX = getConsistentRandomForImage(randomSeed + 2, -3, 3);
        const endX = getConsistentRandomForImage(randomSeed + 3, -3, 3) * -1; // Move in opposite direction
        
        const startY = getConsistentRandomForImage(randomSeed + 4, -3, 3);
        const endY = getConsistentRandomForImage(randomSeed + 5, -3, 3) * -1; // Move in opposite direction
        
        const scale = interpolate(progress, [0, 1], [startScale, endScale]);
        const translateX = interpolate(progress, [0, 1], [startX, endX]);
        const translateY = interpolate(progress, [0, 1], [startY, endY]);
        
        animationStyle.transform = `${animationStyle.transform || ''} scale(${scale}) translate(${translateX}%, ${translateY}%)`;
        break;
      }
      
      case 'subtle-pulse': {
        // A gentle pulsing effect using spring
        const pulseProgress = spring({
          frame: frame % (fps * 4), // Reset every 4 seconds
          fps,
          config: { damping: 20, mass: 0.5 },
        });
        
        const scale = interpolate(pulseProgress, [0, 1], [1, 1.03]);
        animationStyle.transform = `${animationStyle.transform || ''} scale(${scale})`;
        break;
      }
      
      case 'random': {
        // Randomly select one of the animations for each image
        const animations = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'ken-burns'];
        const selectedAnimation = animations[Math.floor(random(randomSeed) * animations.length)];
        
        // Recursively apply the randomly selected animation
        return applyImageAnimation(imageIndex, progress, {
          ...style,
          ...animationStyle,
        });
      }
    }
    
    return animationStyle;
  };

  // Render the image sequence directly in the component
  const renderImageSequence = () => {
    if (images.length === 0) return null;
    
    // Assume each image shows for 5 seconds
    const secondsPerImage = 5;
    const framesPerImage = secondsPerImage * fps;
    
    // Return a series of Sequences with images
    return (
      <>
        {images.map((item, index) => {
          const startTime = index * framesPerImage;
          const duration = framesPerImage;
          
          // Calculate the scale animation
          const scale = interpolate(
            frame,
            [startTime, startTime + duration / 2, startTime + duration],
            [1, 1.2, 1], // Scale from 1 (original) to 1.2 (zoomed-in)
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          return (
            <Sequence key={index} from={startTime} durationInFrames={duration}>
              <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
                <Img
                  src={item.imageUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `scale(${scale})`
                  }}
                />
              </AbsoluteFill>
            </Sequence>
          );
        })}
      </>
    );
  };
  
  // Custom Img component that doesn't require explicit height/width
  const Img = ({ src, style, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return <img src={src} style={style} {...rest} />;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <AbsoluteFill 
        style={{
          position: 'absolute',
          width: containerDimensions.width,
          height: containerDimensions.height,
          left: containerDimensions.left,
          top: containerDimensions.top,
          overflow: 'hidden',
        }}
      >
        {/* Background video if provided */}
        {videoUrl && (
          <Sequence from={0}>
            <Video
              src={videoUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              crossOrigin="anonymous" 
            />
          </Sequence>
        )}

        {/* Image sequence if no video or alongside video */}
        {images.length > 0 && renderImageSequence()}

        {/* Captions based on timing and preset */}
        {!disableCaptions && displayCaption && (
          <div style={getCaptionStyle(captionPreset)}>
            {renderCaptionText(displayCaption.text, displayCaption)}
          </div>
        )}

        {/* Audio track */}
        {audioUrl && (
          <Audio src={audioUrl} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default VideoComposition;
