import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, Audio, Img, Composition } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Roboto';
import { useState } from 'react';

const { fontFamily } = loadFont();

interface TikTokVideoProps {
  segments: Array<{
    contextText: string;
    imageUrl: string;
    audioUrl: string;
    words: Array<{
      text: string;
      start: number;
      end: number;
    }>;
  }>;
}

const CaptionWord = ({ word, frame }: { word: { text: string; start: number; end: number }; frame: number }) => {
  const isVisible = frame >= word.start * 30 && frame <= word.end * 30;
  
  return (
    <span
      className={`inline-block mx-0.5 transition-opacity duration-100 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        fontFamily,
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
      }}
    >
      {word.text}
    </span>
  );
};

const VideoSegment = ({ 
  segment, 
  startFrame = 0,
}: { 
  segment: TikTokVideoProps['segments'][0]; 
  startFrame: number;
  globalAudioUrl?: string;
}) => {
  const frame = useCurrentFrame();
  const durationInFrames = Math.ceil((segment.words[segment.words.length - 1].end + 0.5) * 30);
  const [imageError, setImageError] = useState(false);
  
  return (
    <Sequence from={startFrame} durationInFrames={durationInFrames}>
      <AbsoluteFill>
        {/* Background Image */}
        <div className="absolute inset-0 bg-gray-800">
          {!imageError ? (
            <img
              src={segment.imageUrl}
              className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.8)' }}
              onError={() => setImageError(true)}
            />
          ) : (
            // Fallback for image loading errors
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{ filter: 'brightness(0.8)' }}
            >
              <div className="text-white text-xl">Image unavailable</div>
            </div>
          )}
        </div>
        
        {/* Captions */}
        <div className="absolute bottom-10 left-0 right-0 px-4 text-center">
          <div className="text-white text-2xl font-bold leading-relaxed">
            {segment.words.map((word, index) => (
              <CaptionWord
                key={index}
                word={word}
                frame={frame - startFrame}
              />
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </Sequence>
  );
};

export const TikTokVideo: React.FC<TikTokVideoProps> = ({ segments }) => {
  const _totalDuration = segments.reduce((acc, segment) => {
    const segmentDuration = Math.ceil((segment.words[segment.words.length - 1].end + 0.5) * 30);
    return acc + segmentDuration;
  }, 0);
  
  // All segments share the same audio URL
  const globalAudioUrl = segments[0]?.audioUrl;
  
  let currentStartFrame = 0;
  
  return (
    <AbsoluteFill className="bg-black">
      {/* Global audio that plays throughout the video */}
      {globalAudioUrl && <Audio src={globalAudioUrl} />}
      
      {segments.map((segment, index) => {
        const segmentComponent = (
          <VideoSegment
            key={index}
            segment={segment}
            startFrame={currentStartFrame}
          />
        );
        
        const segmentDuration = Math.ceil((segment.words[segment.words.length - 1].end + 0.5) * 30);
        currentStartFrame += segmentDuration;
        
        return segmentComponent;
      })}
    </AbsoluteFill>
  );
};

// Type-safe wrapper for Remotion composition
const TikTokVideoWrapper: React.FC<Record<string, unknown>> = (props) => {
  return <TikTokVideo segments={(props.segments as TikTokVideoProps['segments']) || []} />;
};

// This component is used by Remotion to find the composition
export const RemotionVideo: React.FC = () => {
  return (
    <Composition
      id="TikTokVideo"
      component={TikTokVideoWrapper}
      durationInFrames={1000} // This will be overridden by the actual calculation
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ segments: [] }}
    />
  );
};

// This is the component we export for direct use
export const RemotionVideoPlayer: React.FC<TikTokVideoProps> = (props) => {
  return (
    <div style={{ flex: 1, backgroundColor: '#000' }}>
      <TikTokVideo {...props} />
    </div>
  );
}; 