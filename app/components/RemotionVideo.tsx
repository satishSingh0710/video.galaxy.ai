import React from 'react';
import { VideoComposition } from '@/components/VideoComposition';

interface RemotionVideoProps {
  audioUrl: string;
  images: Array<{
    imageUrl: string;
    contextText: string;
  }>;
  captions: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  captionStyle?: 'default' | 'highlightEachWord' | 'highlightSpokenWord' | 'wordByWord';
}

export function RemotionVideo({ audioUrl, images, captions, captionStyle = 'default' }: RemotionVideoProps) {
  // Debug captions in RemotionVideo
  React.useEffect(() => {
    console.log('RemotionVideo received captions:', captions);
  }, [captions]);

  return (
    <VideoComposition
      audioUrl={audioUrl}
      images={images}
      captions={captions}
      captionStyle={captionStyle}
    />
  );
}