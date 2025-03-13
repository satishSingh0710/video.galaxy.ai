import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Video,
} from 'remotion';
import { Download } from 'lucide-react';

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
  onDownload?: () => void;
  captionStyle?: 'default' | 'highlightEachWord' | 'highlightSpokenWord' | 'wordByWord';
  isPortrait?: boolean;
}

// Define a type for caption groups
interface CaptionGroup {
  text: string;
  start: number;
  end: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  audioUrl,
  videoUrl,
  images,
  captions,
  onDownload,
  captionStyle = 'default',
  isPortrait = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Calculate the current time in milliseconds with more precision
  const currentTimeInMs = Math.floor((frame / fps) * 1000);

  // Constants for timing adjustments - no delays or buffers
  const TIMING_OFFSET = 0; // No offset
  const DISPLAY_BUFFER = 0; // No buffer
  const MIN_DISPLAY_TIME = 0; // No minimum display time
  const PAUSE_THRESHOLD = 100; // Minimal threshold for detecting pauses

  // Pre-process captions to extract word-level timing
  const processedCaptions = useMemo(() => {
    // First, ensure each caption has the correct timing
    return captions.map(caption => {
      // Calculate word positions based on caption duration
      const words = caption.text.trim().split(/\s+/);
      const wordCount = words.length;
      const captionDuration = caption.end - caption.start;
      const wordDuration = wordCount > 0 ? captionDuration / wordCount : captionDuration;
      
      // Create word-level timing data with exact timing
      const wordTimings = words.map((word, index) => {
        const wordStart = caption.start + (index * wordDuration);
        const wordEnd = index === wordCount - 1 
          ? caption.end 
          : caption.start + ((index + 1) * wordDuration);
        
        return {
          text: word,
          start: wordStart,
          end: wordEnd
        };
      });
      
      return {
        ...caption,
        words: wordTimings,
        // Use exact timing with no offsets
        adjustedStart: caption.start,
        adjustedEnd: caption.end
      };
    });
  }, [captions]);

  // Group captions into semantic chunks with precise word timing
  const captionGroups = useMemo(() => {
    if (!processedCaptions || processedCaptions.length === 0) return [];
    
    const groups: CaptionGroup[] = [];
    let currentGroup: typeof processedCaptions = [];
    let groupStartTime = 0;
    let groupEndTime = 0;
    let wordCount = 0;
    let groupWords: Array<{text: string, start: number, end: number}> = [];
    
    processedCaptions.forEach((caption, index) => {
      const words = caption.text.trim().split(/\s+/);
      const newWordCount = wordCount + words.length;
      
      const isFirstCaption = index === 0;
      const wouldExceedLimit = newWordCount > 4; // Limit groups to 4 words for readability
      const hasSignificantPause = caption.start > groupEndTime + PAUSE_THRESHOLD;
      const isLastCaption = index === processedCaptions.length - 1;
      
      if (isFirstCaption || wouldExceedLimit || hasSignificantPause) {
        if (currentGroup.length > 0) {
          const duration = groupEndTime - groupStartTime;
          
          groups.push({
            text: currentGroup.map(c => c.text).join(' '),
            start: groupStartTime,
            end: groupEndTime, // Use exact end time with no adjustments
            words: groupWords
          });
        }
        
        currentGroup = [caption];
        groupStartTime = caption.start;
        groupEndTime = caption.end;
        wordCount = words.length;
        groupWords = caption.words || [];
      } else {
        currentGroup.push(caption);
        groupEndTime = caption.end;
        wordCount = newWordCount;
        groupWords = groupWords.concat(caption.words || []);
      }

      // Handle the last group
      if (isLastCaption && currentGroup.length > 0) {
        const duration = groupEndTime - groupStartTime;
        
        groups.push({
          text: currentGroup.map(c => c.text).join(' '),
          start: groupStartTime,
          end: groupEndTime, // Use exact end time with no adjustments
          words: groupWords
        });
      }
    });
    
    return groups;
  }, [processedCaptions]);

  // Find current caption group with exact timing - no buffer
  const currentGroup = captionGroups.find(
    group => currentTimeInMs >= group.start && currentTimeInMs <= group.end
  );

  // Find the current word being spoken with exact timing
  const getCurrentWord = () => {
    if (!currentGroup || !currentGroup.words || currentGroup.words.length === 0) {
      return null;
    }
    
    // Find the word that matches the current time exactly
    return currentGroup.words.find(word => 
      currentTimeInMs >= word.start && currentTimeInMs <= word.end
    );
  };

  const currentWord = getCurrentWord();
  
  // Find the index of the current word in the group
  const getCurrentWordIndex = () => {
    if (!currentGroup || !currentGroup.words || !currentWord) return -1;
    
    return currentGroup.words.findIndex(word => 
      word.text === currentWord.text && 
      word.start === currentWord.start
    );
  };

  const currentWordIndex = getCurrentWordIndex();

  // Calculate responsive font size based on video dimensions
  const getResponsiveFontSize = () => {
    // For mobile (portrait orientation)
    if (width < height) {
      // Mobile devices need larger text relative to screen size
      const mobileBaseSize = Math.min(width, height) * 0.045;
      return `${Math.max(20, Math.min(mobileBaseSize, 50))}px`;
    }
    
    // For desktop/landscape
    const baseSize = Math.min(width, height) * 0.04; 
    return `${Math.max(18, Math.min(baseSize, 60))}px`;
  };

  // Calculate responsive padding based on video dimensions
  const getResponsivePadding = () => {
    // For mobile (portrait orientation)
    if (width < height) {
      const mobilePadding = width * 0.03;
      return `${Math.max(12, Math.min(mobilePadding, 30))}px ${Math.max(16, Math.min(mobilePadding * 1.5, 40))}px`;
    }
    
    // For desktop/landscape
    const basePadding = Math.min(width, height) * 0.02;
    const paddingValue = Math.max(12, Math.min(basePadding, 35));
    return `${paddingValue}px ${paddingValue * 1.4}px`;
  };

  // Render caption text based on selected style with precise word timing
  const renderCaptionText = () => {
    if (!currentGroup) return null;
    
    if (captionStyle === 'default') {
      return (
        <div style={{
          color: 'white',
          fontWeight: 600,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
        }}>
          {currentGroup.text}
        </div>
      );
    }
    
    if (captionStyle === 'wordByWord') {
      if (!currentGroup.words || currentWordIndex < 0) return null;
      
      // Show only the current word with distinct styling
      return (
        <div style={{
          color: '#FFFFFF',
          fontWeight: 700,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '4px 8px',
          borderRadius: '6px',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
          transform: 'scale(1.1)',
          transition: 'all 0.2s ease-in-out',
        }}>
          {currentWord?.text || ''}
        </div>
      );
    }
    
    if (captionStyle === 'highlightEachWord' || captionStyle === 'highlightSpokenWord') {
      if (!currentGroup.words || currentGroup.words.length === 0) {
        // Fallback to default style if no words
        return (
          <div style={{
            color: 'white',
            fontWeight: 600,
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
          }}>
            {currentGroup.text}
          </div>
        );
      }
      
      const words = currentGroup.words;
      
      return (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '4px',
        }}>
          {words.map((word, index) => {
            // For highlightEachWord, highlight all words but with different styling
            // For highlightSpokenWord, only highlight the current word
            const isHighlighted = 
              captionStyle === 'highlightEachWord' 
                ? true 
                : (currentWord && word.text === currentWord.text && 
                   word.start === currentWord.start && word.end === currentWord.end);
            
            // Different styling for each mode
            const highlightColor = captionStyle === 'highlightEachWord' ? '#FFFFFF' : '#FFDD00';
            const highlightBg = captionStyle === 'highlightEachWord' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(255, 221, 0, 0.2)';
            const textShadowColor = captionStyle === 'highlightEachWord'
              ? 'rgba(255, 255, 255, 0.8)'
              : 'rgba(255, 221, 0, 0.8)';
            
            return (
              <span
                key={index}
                style={{
                  color: isHighlighted ? highlightColor : 'white',
                  fontWeight: isHighlighted ? 'bold' : 'normal',
                  textShadow: isHighlighted 
                    ? `0 2px 8px ${textShadowColor}` 
                    : '0 2px 4px rgba(0, 0, 0, 0.7)',
                  padding: isHighlighted ? '0px 0px' : '0px 0px',
                  borderRadius: isHighlighted ? '4px' : '0',
                  backgroundColor: isHighlighted ? highlightBg : 'transparent',
                  transition: 'all 0.15s ease-in-out',
                  display: 'inline-block',
                  transform: isHighlighted && captionStyle === 'highlightSpokenWord' ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      );
    }
    
    // Fallback to plain text if no style matches
    return currentGroup.text;
  };

  // Render function for the media content
  const renderMedia = () => {
    // If video is provided, render it
    if (videoUrl) {
      return (
        <>
          <Video
            src={videoUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: isPortrait ? 'contain' : 'cover',
            }}
          />
          {/* If both video and audio are provided, render audio as well */}
          {audioUrl && (
            <Audio src={audioUrl} />
          )}
        </>
      );
    }
    
    // If only audio is provided, render audio with images
    if (audioUrl) {
      return (
        <>
          <Audio src={audioUrl} />
          {/* Render images if available */}
          {images.length > 0 ? (
            // Your existing image rendering code
            images.map((image, index) => (
              <Sequence
                key={index}
                from={Math.floor(index * durationInFrames / images.length)}
                durationInFrames={Math.floor(durationInFrames / images.length)}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#000',
                  }}
                >
                  <img
                    src={image.imageUrl}
                    alt={image.contextText}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              </Sequence>
            ))
          ) : (
            // If no images, show a placeholder
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#000',
                color: '#fff',
                fontSize: '2rem',
                textAlign: 'center',
                padding: '2rem',
              }}
            >
              Audio Visualization
            </div>
          )}
        </>
      );
    }
    
    return null;
  };

  // Calculate responsive bottom position based on video orientation
  const getResponsiveBottomPosition = () => {
    if (isPortrait) {
      // For portrait videos, position captions higher up
      return '15%';
    }
    
    const basePosition = Math.min(width, height) * 0.05;
    const minPosition = 20;
    const maxPosition = 60;
    
    return `${Math.max(minPosition, Math.min(basePosition, maxPosition))}px`;
  };

  // Calculate responsive max-width based on video orientation
  const getResponsiveMaxWidth = () => {
    // For portrait videos, use more width
    if (isPortrait) {
      return '90%';
    }
    
    // For mobile (portrait orientation)
    if (width < height) {
      return '85%'; // Use more width on mobile but not too much
    }
    
    // For desktop/landscape
    return '75%';
  };

  // Return the composition with AbsoluteFill to ensure proper rendering
  return (
    <AbsoluteFill style={{ 
      backgroundColor: 'black',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {renderMedia()}
        
        {/* Caption container with responsive positioning */}
        {currentGroup && (
          <div style={{
            position: 'absolute',
            bottom: getResponsiveBottomPosition(),
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: getResponsiveMaxWidth(),
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '8px',
            padding: getResponsivePadding(),
            fontSize: getResponsiveFontSize(),
            textAlign: 'center',
            zIndex: 10,
          }}>
            {renderCaptionText()}
          </div>
        )}
        
        {/* Download button if provided */}
        {onDownload && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 20,
          }}>
            <button
              onClick={onDownload}
              style={{
                backgroundColor: 'white',
                color: 'black',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Download size={20} />
            </button>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}; 