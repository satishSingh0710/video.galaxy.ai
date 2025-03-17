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

    const checkProgress = async () => {
      if (!renderId) return;

      try {
        const response = await fetch(`/api/remotion/status?id=${renderId}`);
        
        if (!response.ok) {
          throw new Error('Failed to check render status');
        }
        
        const data = await response.json();
        
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
        }
        
        // Continue polling
        intervalId = setTimeout(checkProgress, 2000);
      } catch (err) {
        console.error('Error checking render progress:', err);
        
        // Implement retry logic
        retryCount++;
        if (retryCount < maxRetryCount) {
          console.log(`Retrying progress check (${retryCount}/${maxRetryCount})...`);
          retryTimeoutId = setTimeout(checkProgress, 3000 * retryCount); // Exponential backoff
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
      
      const response = await fetch('/api/tweettovideo/videos');
      
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
    return new Date(date).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-gray-900 text-white border-gray-800">
        <DialogHeader className="border-b border-gray-800 pb-4">
          <DialogTitle className="text-xl font-bold">Tweet Video History</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4">
          {/* Video list */}
          <div className="w-full md:w-1/3 bg-gray-800/50 rounded-lg overflow-hidden">
            <ScrollArea className="h-[calc(90vh-10rem)]">
              {loading ? (
                <div className="flex items-center justify-center h-32 p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm">Loading videos...</span>
                </div>
              ) : error ? (
                <div className="p-4 text-red-400 text-sm">{error}</div>
              ) : videos.length === 0 ? (
                <div className="p-4 text-gray-400 text-sm">No videos found</div>
              ) : (
                <div className="space-y-2 p-2">
                  {videos.map((video) => (
                    <button
                      key={video._id}
                      onClick={() => handlePlayVideo(video)}
                      className={`w-full text-left p-3 rounded-lg transition-all hover:bg-gray-700/50 ${
                        selectedVideo?._id === video._id ? 'bg-gray-700/50 ring-1 ring-blue-500' : ''
                      }`}
                    >
                      <h3 className="font-medium truncate text-sm">{video.title}</h3>
                      <div className="flex items-center text-xs text-gray-400 mt-1.5">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{formatDate(video.createdAt)}</span>
                        <Clock className="h-3 w-3 ml-3 mr-1" />
                        <span>{Math.round(video.duration)}s</span>
                      </div>
                      {video.tweetUrl && (
                        <div className="text-xs text-gray-400 mt-1.5 truncate">
                          <span>Tweet: {video.tweetUrl}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Video preview */}
          <div className="w-full md:w-2/3 bg-gray-800/50 rounded-lg overflow-hidden flex flex-col">
            {!selectedVideo ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-gray-400">
                <Calendar className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-center">Select a video from the list to preview</p>
              </div>
            ) : (
              <>
                <div className="relative bg-black/50">
                  {showPlayer && selectedVideo && (
                    <div className={`w-full ${isPortraitVideo ? 'aspect-[9/16]' : 'aspect-video'} mx-auto`}>
                      <Player
                        component={RemotionVideo}
                        inputProps={{
                          audioUrl: selectedVideo.audioUrl,
                          captions: selectedVideo.captions || [],
                          captionPreset: captionPreset,
                          captionAlignment: captionAlignment,
                          segments: selectedVideo.images.map(img => ({
                            imageUrl: img.imageUrl,
                            ContextText: img.contextText,
                            ImagePrompt: ''
                          }))
                        }}
                        durationInFrames={Math.round((selectedVideo.duration || 10) * 30)}
                        compositionWidth={1080}
                        compositionHeight={1920}
                        fps={30}
                        controls
                        style={{
                          width: '100%',
                          height: '100%'
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">{selectedVideo.title}</h2>
                    
                    {selectedVideo.tweetUrl && (
                      <div className="text-sm">
                        <span className="text-gray-400">Tweet URL: </span>
                        <a 
                          href={selectedVideo.tweetUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline break-all"
                        >
                          {selectedVideo.tweetUrl}
                        </a>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-300">
                      <div>
                        <span className="text-gray-400">Created: </span>
                        <span>{formatDate(selectedVideo.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Duration: </span>
                        <span>{Math.round(selectedVideo.duration)} seconds</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      onClick={handleRender}
                      disabled={isRendering}
                      className="flex items-center gap-2"
                    >
                      {isRendering ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Rendering...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Render Video
                        </>
                      )}
                    </Button>
                    
                    {downloadUrl && (
                      <Button
                        onClick={handleDownload}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    )}
                  </div>
                  
                  {isRendering && (
                    <div className="space-y-2">
                      <Progress value={renderProgress} className="h-2" />
                      <p className="text-xs text-gray-400">
                        {renderProgress < 100 
                          ? `Rendering: ${Math.round(renderProgress)}%` 
                          : 'Render complete!'}
                      </p>
                    </div>
                  )}
                  
                  {error && (
                    <div className="p-3 bg-red-900/30 border border-red-800 rounded-md text-sm text-red-300">
                      {error}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 