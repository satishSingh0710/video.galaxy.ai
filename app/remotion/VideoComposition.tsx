import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
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
  captionStyle?: 'default' | 'highlightEachWord' | 'highlightSpokenWord' | 'wordByWord';
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
  images,
  captions,
  onDownload,
  captionStyle = 'default',
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
    // Calculate base size as a percentage of the smallest dimension
    const baseSize = Math.min(width, height) * 0.035; 
    
    // Apply a maximum size cap for larger screens
    const maxSize = 60; // Maximum font size in pixels
    
    // Apply a minimum size floor for very small screens
    const minSize = 16; // Minimum font size in pixels
    
    return `${Math.max(minSize, Math.min(baseSize, maxSize))}px`;
  };

  // Calculate responsive padding based on video dimensions
  const getResponsivePadding = () => {
    // Calculate base padding as a percentage of the smallest dimension
    const basePadding = Math.min(width, height) * 0.015;
    
    // Apply minimum and maximum constraints
    const minPadding = 10; // Minimum padding in pixels
    const maxPadding = 35; // Maximum padding in pixels
    
    const paddingValue = Math.max(minPadding, Math.min(basePadding, maxPadding));
    
    return `${paddingValue}px ${paddingValue * 1.4}px`;
  };

  // Calculate responsive max-width based on video dimensions
  const getResponsiveMaxWidth = () => {
    // For mobile (portrait orientation)
    if (width < height) {
      return '95%'; // Use more width on mobile
    }
    
    // For desktop/landscape
    return '80%';
  };

  // Render caption text based on selected style with precise word timing
  const renderCaptionText = () => {
    if (!currentGroup) return null;
    
    if (captionStyle === 'default') {
      return currentGroup.text;
    }
    
    if (captionStyle === 'wordByWord') {
      if (!currentGroup.words || currentWordIndex < 0) return null;
      
      // Show only the current word
      return currentWord?.text || '';
    }
    
    if (captionStyle === 'highlightEachWord' || captionStyle === 'highlightSpokenWord') {
      if (!currentGroup.words) return currentGroup.text;
      
      return (
        <>
          {currentGroup.words?.map((word, index) => {
            // For highlightEachWord, highlight all words
            // For highlightSpokenWord, only highlight the current word
            const isHighlighted = 
              captionStyle === 'highlightEachWord' 
                ? true 
                : (currentWord && word.text === currentWord.text && 
                   word.start === currentWord.start && word.end === currentWord.end);
            
            return (
              <React.Fragment key={index}>
                <span
                  style={{
                    color: isHighlighted ? '#FFD700' : 'white',
                    fontWeight: isHighlighted ? 'bold' : 'normal',
                    textShadow: isHighlighted 
                      ? '0 2px 8px rgba(255, 215, 0, 0.7)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.7)',
                  }}
                >
                  {word.text}
                </span>
                {index < (currentGroup.words?.length || 0) - 1 ? ' ' : ''}
              </React.Fragment>
            );
          })}
        </>
      );
    }
    
    return currentGroup.text;
  };

  // Calculate which image to show based on time
  const segmentDuration = durationInFrames / (images.length || 1);
  const currentImageIndex = Math.floor(frame / segmentDuration);
  const currentImage = images[Math.min(currentImageIndex, images.length - 1)];

  // Simple image opacity without animation
  const imageOpacity = 1;

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Background Image */}
      <AbsoluteFill
        style={{
          opacity: imageOpacity,
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
          padding: '0 10px', // Reduced side padding for mobile
          zIndex: 1000,
        }}
      >
        {/* Current caption group - no animations */}
        {currentGroup && (
          <div
            style={{
              position: 'relative',
              maxWidth: getResponsiveMaxWidth(),
              width: 'auto',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: getResponsivePadding(),
              borderRadius: '16px',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
              opacity: 1, // Full opacity, no animation
            }}
          >
            <p
              style={{
                color: 'white',
                fontSize: getResponsiveFontSize(),
                fontWeight: 'bold',
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.3,
                letterSpacing: '0.01em',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {renderCaptionText()}
            </p>
          </div>
        )}
      </AbsoluteFill>

      {/* Download Button - Responsive positioning */}
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
              width: width < 480 ? '36px' : '48px', // Smaller on mobile
              height: width < 480 ? '36px' : '48px', // Smaller on mobile
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Download size={width < 480 ? 18 : 24} />
          </button>
        </div>
      )}

      {/* Audio Track */}
      <Audio src={audioUrl} />
    </AbsoluteFill>
  );
}; 