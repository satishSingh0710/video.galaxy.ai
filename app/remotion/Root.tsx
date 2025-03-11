import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TikTokVideo"
        component={VideoComposition as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          audioUrl: 'https://res.cloudinary.com/drt6u2nwp/video/upload/v1741602906/audio-uploads/z9msjfmzvvfw9dkyuncs.mp3',
          images: [],
          captions: [],
          captionStyle: 'default',
        }}
      />
    </>
  );
}; 