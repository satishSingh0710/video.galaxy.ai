import { renderMedia, selectComposition } from '@remotion/renderer';
import { RemotionVideo } from '@/components/RemotionVideo';
import { uploadToCloudinary } from './cloudinary';

interface RenderVideoProps {
  audioUrl: string;
  images: Array<{
    imageUrl: string;
    contextText: string;
  }>;
  captions: Array<{
    text: string;
    start: number;
    end: number;
    _id?: string;
  }>;
}

export const renderAndDownloadVideo = async (props: RenderVideoProps): Promise<string> => {
  try {
    // Calculate video duration based on the last caption's end time
    const lastCaption = props.captions[props.captions.length - 1];
    const durationInFrames = Math.ceil((lastCaption?.end || 10000) / 1000 * 30); // 30 fps

    // Render the video
    const renderedVideo = await renderMedia({
      composition: {
        component: RemotionVideo,
        durationInFrames,
        fps: 30,
        height: 1920,
        width: 1080,
        props,
      },
      codec: 'h264',
      imageFormat: 'jpeg',
      serveUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      outputLocation: `out/video-${Date.now()}.mp4`,
    });

    // Upload to Cloudinary for better delivery
    const cloudinaryUrl = await uploadToCloudinary(renderedVideo, 'video', {
      resource_type: 'video',
      folder: 'rendered-videos',
    });

    return cloudinaryUrl;
  } catch (error) {
    console.error('Error rendering video:', error);
    throw error;
  }
}; 