import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition } from '../../components/VideoComposition';

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
          audioUrl: '',
          images: [],
          captions: [],
          captionStyle: 'default',
        }}
      />
    </>
  );
};