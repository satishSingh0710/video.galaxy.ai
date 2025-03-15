'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Play, Download, Clock, Calendar, Loader2 } from 'lucide-react';
import { Player } from '@remotion/player';
import { RemotionVideo } from '@/app/remotion/RemotionVideo';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Video {
  _id: string;
  title: string;
  script: string;
  audioUrl: string;
  duration: number;
  images: Array<{
    contextText: string;
    imageUrl: string;
  }>;
  createdAt: string;
  captions?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  captionPreset?: 'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS' | 'ALL';
  captionAlignment?: 'top' | 'middle' | 'bottom';
  screenRatio?: '1/1' | '16/9' | '9/16' | 'auto';
}

interface VideoHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoHistoryModal({ isOpen, onClose }: VideoHistoryModalProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [captionPreset, setCaptionPreset] = useState<'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS' | 'ALL'>('BASIC');
  const [captionAlignment, setCaptionAlignment] = useState<'top' | 'middle' | 'bottom'>('bottom');
  const audioRef = useRef<HTMLAudioElement>(null);

  // Rendering states
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [renderComplete, setRenderComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isPortraitVideo, setIsPortraitVideo] = useState(true); // TikTok videos are typically portrait

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedVideo?.audioUrl) {
      setAudioLoading(true);
      const audio = new Audio(selectedVideo.audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
        setAudioLoading(false);
      });
      audio.addEventListener('error', () => {
        console.error('Error loading audio for duration detection');
        // Use the video's duration field as fallback if available
        if (selectedVideo.duration) {
          setAudioDuration(selectedVideo.duration);
        } else {
          // Default to 10 seconds if all else fails
          setAudioDuration(10);
        }
        setAudioLoading(false);
      });
      return () => {
        audio.remove();
      };
    }
  }, [selectedVideo?.audioUrl, selectedVideo?.duration]);

  // Poll for render progress
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let retryTimeoutId: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetryCount = 5;
    const baseDelay = 10000; // Increase to 10 seconds to reduce rate limit issues

    const checkProgress = async () => {
      try {
        const response = await fetch('/api/lambda/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: renderId }),
        });

        if (!response.ok) {
          // Check for status codes first
          if (response.status === 429) {
            // Rate limiting - handle with backoff
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
            console.warn(`Rate limited (status code). Retrying in ${retryAfter} seconds`);

            // Clear the polling interval
            if (intervalId) clearInterval(intervalId);

            // Schedule a one-time retry after the specified delay
            retryTimeoutId = setTimeout(() => {
              // Restart polling with a longer interval
              startPolling(baseDelay * Math.pow(2, Math.min(retryCount, 4))); // Max ~32 second interval
            }, retryAfter * 1000);

            return;
          }
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse response as JSON:', jsonError);
          throw new Error('Invalid response format from server');
        }

        if (data.type === 'error') {
          // Check if the error is retryable
          if (data.retryable) {
            // This is a retryable error (like temporary AWS issues)
            retryCount++;
            console.warn(`Retryable error: ${data.message}`);

            if (retryCount <= maxRetryCount) {
              // Calculate backoff delay: 2s, 4s, 8s, 16s, 32s
              const backoffDelay = baseDelay * Math.pow(2, retryCount - 1);
              console.warn(`Retrying after error in ${backoffDelay / 1000}s (attempt ${retryCount}/${maxRetryCount})`);

              // Clear the polling interval
              if (intervalId) clearInterval(intervalId);

              // Schedule a one-time retry after backoff delay
              retryTimeoutId = setTimeout(() => {
                startPolling(Math.min(baseDelay * Math.pow(2, retryCount), 30000));
              }, backoffDelay);

              return;
            }
          }

          // Non-retryable error or max retries exceeded
          setError(data.message);
          setIsRendering(false);
          return;
        } else if (data.type === 'done') {
          setRenderProgress(100);
          setIsRendering(false);
          setRenderComplete(true);
          setDownloadUrl(data.url);
          return;
        } else if (data.type === 'progress') {
          setRenderProgress(data.progress * 100);
          // Reset retry count on successful response
          retryCount = 0;
        } else if (data.type === 'rate-limited') {
          // Handle rate limiting with exponential backoff
          const retryAfter = data.retryAfter || 5; // Default to 5 seconds if not provided
          const nextRetryDelay = retryAfter * 1000;

          console.warn(`Rate limited. Retrying in ${retryAfter} seconds`);

          // Clear the polling interval
          if (intervalId) clearInterval(intervalId);

          // Schedule a one-time retry after the specified delay
          retryTimeoutId = setTimeout(() => {
            // Restart polling with a longer interval
            startPolling(baseDelay * Math.pow(2, Math.min(retryCount, 4))); // Max ~32 second interval
          }, nextRetryDelay);

          return;
        } else if (data.type === 'concurrency-limit') {
          // Handle AWS Lambda concurrency limit - this is more serious
          const retryAfter = data.retryAfter || 15; // Longer default wait for concurrency issues
          const nextRetryDelay = retryAfter * 1000;

          console.warn(`AWS Lambda concurrency limit reached. Retrying in ${retryAfter} seconds`);

          // Show a more specific message but don't stop rendering yet
          setError(`AWS Lambda concurrency limit reached. Waiting ${retryAfter} seconds before retrying...`);

          // Clear the polling interval
          if (intervalId) clearInterval(intervalId);

          // Schedule a one-time retry after a longer delay
          retryTimeoutId = setTimeout(() => {
            // Clear the error message when retrying
            setError(null);
            // Restart polling with a much longer interval
            startPolling(Math.max(baseDelay * 4, 8000)); // Use at least 8 seconds between polls
          }, nextRetryDelay);

          return;
        } else {
          console.warn(`Unknown response type: ${data.type}`);
        }
      } catch (err) {
        console.error('Error checking render progress:', err);

        // Implement exponential backoff for errors
        retryCount++;

        if (retryCount <= maxRetryCount) {
          // Clear the polling interval
          if (intervalId) clearInterval(intervalId);

          // Calculate backoff delay: 2s, 4s, 8s, 16s, 32s
          const backoffDelay = baseDelay * Math.pow(2, retryCount - 1);
          console.warn(`Error fetching progress. Retry ${retryCount}/${maxRetryCount} in ${backoffDelay / 1000}s`);

          // Schedule a one-time retry after backoff delay
          retryTimeoutId = setTimeout(() => {
            startPolling(Math.min(baseDelay * Math.pow(2, retryCount), 30000)); // Max 30 second interval
          }, backoffDelay);

          return;
        } else {
          setError('Failed to check rendering progress after multiple attempts');
          setIsRendering(false);
        }
      }
    };

    const startPolling = (interval: number) => {
      // Wait 3 seconds before first check to give Lambda time to initialize
      retryTimeoutId = setTimeout(() => {
        // Initial check
        checkProgress();

        // Set up the interval for subsequent checks
        intervalId = setInterval(checkProgress, interval);
      }, 3000);
    };

    if (isRendering && renderId) {
      startPolling(baseDelay);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
    };
  }, [isRendering, renderId]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tik-tok-video-gen/videos');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      const processedVideos = data.map((video: any) => ({
        ...video,
        title: video.title || 'Untitled',
        script: video.script || 'No script available',
        images: Array.isArray(video.images) ? video.images : [],
        createdAt: video.createdAt || new Date().toISOString(),
        captions: video.captions || [],
        captionPreset: video.captionPreset,
        captionAlignment: video.captionAlignment,
        screenRatio: video.screenRatio
      }));

      setVideos(processedVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError('Failed to load videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayVideo = (video: Video) => {
    // Reset rendering states when selecting a new video
    setIsRendering(false);
    setRenderProgress(0);
    setRenderId(null);
    setRenderComplete(false);
    setDownloadUrl(null);
    setError(null);

    // Set caption settings from the video
    setCaptionPreset(video.captionPreset || 'BASIC');
    setCaptionAlignment(video.captionAlignment || 'middle');

    setSelectedVideo(video);
    setShowPlayer(true);
  };

  const handleRender = async () => {
    if (!selectedVideo) return;

    try {
      setIsRendering(true);
      setRenderProgress(0);
      setRenderComplete(false);
      setDownloadUrl(null);
      setError(null);

      // Construct the input props needed for rendering
      const inputProps = {
        audioUrl: selectedVideo.audioUrl,
        images: selectedVideo.images || [],
        captions: selectedVideo.captions || [],
        isPortrait: true, // TikTok videos are portrait
        captionPreset,
        captionAlignment,
        screenRatio: selectedVideo.screenRatio || '1/1'
      };

      // Send the render request
      const response = await fetch('/api/lambda/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 'TikTokVideo', // The correct composition ID from the Remotion project
          inputProps,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start rendering');
      }

      const result = await response.json();
      setRenderId(result.renderId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during rendering');
      console.error('Error starting render:', err);
      setIsRendering(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay - increased blur without dark background */}
          <div
            className="fixed inset-0 backdrop-blur-md bg-white/30 transition-opacity"
            onClick={onClose}
          />

          {/* Modal panel - adjusted for better mobile scrolling */}
          <div className="inline-block w-full max-w-7xl transform overflow-hidden rounded-lg bg-white p-4 md:p-6 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={onClose}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="w-full">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 md:mb-6">
                Your Videos
              </h3>

              <ScrollArea className="h-[50vh] md:h-[70vh] w-full rounded-md overflow-y-auto -mx-2 px-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-blue-600"></div>
                  </div>
                ) : error ? (
                  <p className="py-8 text-center text-red-500">{error}</p>
                ) : videos.length === 0 ? (
                  <p className="py-8 text-center text-gray-500">No videos found</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-2 md:p-4">
                    {videos.map((video) => (
                      <div
                        key={video._id}
                        className="group relative bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                      >
                        {/* Thumbnail */}
                        <div className="relative overflow-hidden bg-gray-100">
                          {video.images[0] && (
                            <img
                              src={video.images[0].imageUrl}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {/* Play button overlay */}
                          {video.audioUrl && (
                            <button
                              onClick={() => handlePlayVideo(video)}
                              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            >
                              <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                                <Play className="h-6 w-6 text-white" />
                              </div>
                            </button>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          {/* <h4 className="font-semibold text-lg mb-2 line-clamp-1">
                            {video.title}
                          </h4> */}
                          {/* <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {video.script}
                          </p> */}

                          {/* Metadata */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(video.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Dialog */}
      {selectedVideo && (
        <Dialog open={showPlayer} onOpenChange={(open: boolean) => {
          setShowPlayer(open);
          if (!open) setSelectedVideo(null);
        }}>
          <DialogOverlay className="backdrop-blur-md bg-white/30" />
          <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 md:p-6 shadow-lg duration-200 sm:rounded-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex justify-between items-center">
             <DialogTitle className="text-xl font-bold"></DialogTitle>
            </DialogHeader>
            {isRendering && (
              <div className="w-full space-y-1">
                <Progress value={renderProgress} className="w-full h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  This may take a few minutes
                </p>
              </div>
            )}

            {/* Layout with controls on right side */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* Video player container */}
              <div className="order-1 h-[500px] w-full md:w-2/3 max-w-lg mx-auto">
                {audioLoading ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="h-8 w-8 mx-auto border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading video...</p>
                    </div>
                  </div>
                ) : (
                  <RemotionVideo
                    audioUrl={selectedVideo.audioUrl}
                    duration={audioDuration || undefined}
                    images={selectedVideo.images}
                    captions={selectedVideo.captions || []}
                    captionPreset={captionPreset}
                    captionAlignment={captionAlignment}
                    screenRatio={selectedVideo.screenRatio || '9/16'}
                  />
                )}
              </div>

              {/* All controls - positioned on right side */}
              <div className="order-2 w-full md:w-1/3 flex flex-col md:justify-center space-y-4">
                {/* Caption Style dropdown */}
                <div className="space-y-2">
                  <label htmlFor="captionPreset" className="block text-sm font-medium text-gray-700">
                    Caption Style
                  </label>
                  <div className="relative">
                    <select
                      id="captionPreset"
                      value={captionPreset}
                      onChange={(e) => setCaptionPreset(e.target.value as 'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS' | 'ALL')}
                      className="appearance-none w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="BASIC">Basic</option>
                      <option value="HORMOZI">Hormozi</option>
                      <option value="WRAP 1">Wrap 1</option>
                      <option value="WRAP 2">Wrap 2</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Caption Position dropdown */}
                <div className="space-y-2">
                  <label htmlFor="captionAlignment" className="block text-sm font-medium text-gray-700">
                    Caption Position
                  </label>
                  <div className="relative">
                    <select
                      id="captionAlignment"
                      value={captionAlignment}
                      onChange={(e) => setCaptionAlignment(e.target.value as 'top' | 'middle' | 'bottom')}
                      className="appearance-none w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="top">Top</option>
                      <option value="middle">Middle</option>
                      <option value="bottom">Bottom</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-4 space-y-2">
                  {renderComplete ? (
                    <Button
                      variant="default"
                      className="flex items-center justify-center w-full"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Video
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRender}
                      variant="default"
                      disabled={isRendering}
                      className="w-full"
                    >
                      {isRendering ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Rendering: {Math.round(renderProgress)}%</span>
                        </div>
                      ) : (
                        "Render Video"
                      )}
                    </Button>
                  )}

                  <Button
                    onClick={() => setSelectedVideo(null)}
                    variant="outline"
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 