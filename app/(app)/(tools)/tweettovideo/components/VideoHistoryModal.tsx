'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Play, Download, Clock, Calendar, Loader2, Trash2 } from 'lucide-react';
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
  tweetUrl?: string;
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

  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

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
      if (!renderId) return;

      try {
        const response = await fetch(`/api/remotion/status?id=${renderId}`);
        
        if (!response.ok) {
          // Check for status codes first
          if (response.status === 429) {
            // Rate limiting - handle with backoff
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
            console.warn(`Rate limited (status code). Retrying in ${retryAfter} seconds`);

            // Clear the polling interval
            if (intervalId) clearTimeout(intervalId);

            // Schedule a one-time retry after the specified delay
            retryTimeoutId = setTimeout(() => {
              // Restart polling with a longer interval
              startPolling(baseDelay * Math.pow(2, Math.min(retryCount, 4))); // Max ~32 second interval
            }, retryAfter * 1000);

            return;
          }
          
          throw new Error('Failed to check render status');
        }
        
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse response as JSON:', jsonError);
          throw new Error('Invalid response format from server');
        }
        
        if (data.status === 'error') {
          console.error('Render error:', data.error);
          setIsRendering(false);
          setRenderProgress(0);
          setRenderId(null);
          setError('Failed to render video: ' + data.error);
          return;
        }
        
        if (data.status === 'done') {
          setIsRendering(false);
          setRenderProgress(100);
          setRenderComplete(true);
          setDownloadUrl(data.url);
          return;
        }
        
        // Update progress
        if (data.progress !== undefined) {
          setRenderProgress(data.progress * 100);
          // Reset retry count on successful response
          retryCount = 0;
        }
        
        // Continue polling
        intervalId = setTimeout(checkProgress, 2000);
      } catch (err) {
        console.error('Error checking render progress:', err);
        
        // Implement exponential backoff for errors
        retryCount++;
        
        if (retryCount <= maxRetryCount) {
          // Calculate backoff delay: 2s, 4s, 8s, 16s, 32s
          const backoffDelay = baseDelay * Math.pow(2, retryCount - 1);
          console.warn(`Error fetching progress. Retry ${retryCount}/${maxRetryCount} in ${backoffDelay / 1000}s`);
          
          // Schedule a one-time retry after backoff delay
          retryTimeoutId = setTimeout(() => {
            startPolling(Math.min(baseDelay * Math.pow(2, retryCount), 30000)); // Max 30 second interval
          }, backoffDelay);
        } else {
          setIsRendering(false);
          setRenderProgress(0);
          setRenderId(null);
          setError('Failed to check render status after multiple attempts');
        }
      }
    };

    const startPolling = (interval: number) => {
      if (isRendering && renderId) {
        // Clear any existing intervals
        if (intervalId) clearTimeout(intervalId);
        if (retryTimeoutId) clearTimeout(retryTimeoutId);
        
        // Reset retry counter
        retryCount = 0;
        
        // Start polling
        intervalId = setTimeout(checkProgress, interval);
      }
    };

    if (isRendering && renderId) {
      startPolling(2000);
    }

    return () => {
      if (intervalId) clearTimeout(intervalId);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
    };
  }, [isRendering, renderId]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tweettovideo/videos', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDeletingVideoId(videoId);
      
      const response = await fetch(`/api/tweettovideo/videos/${videoId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete video');
      }
      
      // Remove the deleted video from the state
      setVideos(videos.filter(video => video._id !== videoId));
    } catch (err) {
      console.error('Error deleting video:', err);
      setError('Failed to delete video. Please try again later.');
    } finally {
      setDeletingVideoId(null);
    }
  };

  const handlePlayVideo = (video: Video) => {
    setSelectedVideo(video);
    setCaptionPreset(video.captionPreset || 'BASIC');
    setCaptionAlignment(video.captionAlignment || 'bottom');
    setIsPortraitVideo(video.screenRatio === '9/16' || !video.screenRatio);
    setShowPlayer(true);
    setRenderComplete(false);
    setDownloadUrl(null);
    setIsRendering(false);
    setRenderProgress(0);
    setRenderId(null);
    setError(null);
  };

  const handleRender = async () => {
    if (!selectedVideo) return;
    
    try {
      setIsRendering(true);
      setRenderProgress(0);
      setRenderComplete(false);
      setDownloadUrl(null);
      setError(null);
      
      // Prepare segments for rendering
      const segments = selectedVideo.images.map((image, index) => ({
        ContextText: image.contextText,
        ImagePrompt: '', // Not needed for rendering
        imageUrl: image.imageUrl
      }));
      
      // Start the rendering process
      const response = await fetch('/api/remotion/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl: selectedVideo.audioUrl,
          segments: segments,
          captions: selectedVideo.captions || [],
          captionPreset: captionPreset,
          captionAlignment: captionAlignment,
          audioDuration: selectedVideo.duration,
          title: selectedVideo.title,
          screenRatio: selectedVideo.screenRatio || '9/16'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start rendering');
      }
      
      const data = await response.json();
      setRenderId(data.id);
      
    } catch (err: any) {
      console.error('Error starting render:', err);
      setIsRendering(false);
      setError(err.message || 'Failed to start rendering');
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
          {/* Background overlay with blur */}
          <div
            className="fixed inset-0 backdrop-blur-md bg-white/30 transition-opacity"
            onClick={onClose}
          />

          {/* Modal panel */}
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
                Your Tweet Videos
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
                        <div className="relative h-52 overflow-hidden bg-gray-100">
                          {video.images[0] && (
                            <img
                              src={video.images[0].imageUrl}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {/* Play button overlay */}
                          <button
                            onClick={() => handlePlayVideo(video)}
                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          >
                            <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                              <Play className="h-6 w-6 text-white" />
                            </div>
                          </button>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h4 className="font-semibold text-lg mb-2 line-clamp-1">
                            {video.title}
                          </h4>

                          {/* Metadata */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(video.createdAt)}</span>
                            </div>
                            
                            {/* Delete button */}
                            <button
                              onClick={(e) => handleDeleteVideo(video._id, e)}
                              disabled={deletingVideoId === video._id}
                              className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 hover:bg-gray-100"
                            >
                              {deletingVideoId === video._id ? (
                                <div className="h-4 w-4 border-2 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                              )}
                            </button>
                          </div>
                          
                          {video.tweetUrl && (
                            <div className="mt-2 text-xs text-gray-500 truncate">
                              <span className="block truncate">{video.tweetUrl}</span>
                            </div>
                          )}
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
              <DialogTitle className="text-xl font-bold">{selectedVideo.title}</DialogTitle>
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
                  <div className={`w-full h-full ${isPortraitVideo ? 'aspect-[9/16]' : 'aspect-video'}`}>
                    <RemotionVideo
                      audioUrl={selectedVideo.audioUrl}
                      duration={audioDuration || undefined}
                      captions={selectedVideo.captions || []}
                      captionPreset={captionPreset}
                      captionAlignment={captionAlignment}
                      images={selectedVideo.images}
                      screenRatio={selectedVideo.screenRatio || '9/16'}
                    />
                  </div>
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
                      <option value="FACELESS">Faceless</option>
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

                {/* Tweet URL display */}
                {selectedVideo.tweetUrl && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Tweet URL
                    </label>
                    <a 
                      href={selectedVideo.tweetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all block"
                    >
                      {selectedVideo.tweetUrl}
                    </a>
                  </div>
                )}

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
                    onClick={() => setShowPlayer(false)}
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