"use client"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Player } from '@remotion/player';
import { RemotionVideo } from "./RemotionVideo";
import { useEffect, useState } from "react";
import { renderAndDownloadVideo } from "@/app/utils/videoRenderer";
import toast from "react-hot-toast";
import { Download, Loader2, X } from "lucide-react";

interface PlayerDialogueProps {
  playVideo: boolean;
  videoId: string;
  videoData?: {
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
  };
}

export default function PlayerDialogue({ playVideo, videoId, videoData }: PlayerDialogueProps) {
  const [openDialog, setOpenDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  useEffect(() => {
    if (playVideo && videoData?.audioUrl) {
      setOpenDialog(playVideo);
      // Load audio duration
      const audio = new Audio(videoData.audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
      });
      return () => {
        audio.remove();
      };
    }
  }, [playVideo, videoData]);

  const handleDownload = async () => {
    if (!videoData) {
      toast.error("Video data not available");
      return;
    }

    try {
      setIsDownloading(true);
      const videoUrl = await renderAndDownloadVideo(videoData);
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `video-${videoId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Video downloaded successfully!");
    } catch (error) {
      console.error("Error downloading video:", error);
      toast.error("Failed to download video. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Calculate duration based on multiple factors
  const durationInFrames = Math.max(
    // Duration based on the last caption end time
    Math.ceil((videoData?.captions?.[videoData.captions.length - 1]?.end || 0) / 1000 * 30),
    // Duration based on audio duration
    Math.ceil((audioDuration || 10) * 30),
    // Minimum duration for images
    (videoData?.images.length || 1) * 30
  );

  return (
    <>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Your Video is Ready!
            </DialogTitle>
            <button
              onClick={() => setOpenDialog(false)}
              className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </DialogHeader>

          <div className="aspect-[9/16] w-full max-w-sm mx-auto relative">
            <Player
              component={RemotionVideo as any}
              durationInFrames={durationInFrames}
              fps={30}
              compositionWidth={1080}
              compositionHeight={1920}
              style={{
                width: '100%',
                height: '100%',
              }}
              controls
              inputProps={{
                audioUrl: videoData?.audioUrl,
                images: videoData?.images || [],
                captions: videoData?.captions || [],
              }}
            />

            {/* Download button overlay */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="absolute right-4 bottom-20 z-50 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-all hover:scale-105 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Processing...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  {/* <span className="text-sm">Download MP4</span> */}
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}