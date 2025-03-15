"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Clock, FileText, Download } from "lucide-react";
import { RemotionVideo } from "@/app/remotion/RemotionVideo";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VideoCaption {
  _id: string;
  videoUrl: string;
  captions: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  fullText: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const [videos, setVideos] = useState<VideoCaption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoCaption | null>(null);
  const [isPortraitVideo, setIsPortraitVideo] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const remotionRef = useRef<HTMLDivElement>(null);
  
  // Caption customization options
  const [captionPosition, setCaptionPosition] = useState<'top' | 'middle' | 'bottom'>('bottom');
  const [captionPreset, setCaptionPreset] = useState<'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS'>('BASIC');
  
  // Rendering states
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [renderComplete, setRenderComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
    }
  }, [isOpen]);

  // Check if the selected video is portrait
  useEffect(() => {
    if (selectedVideo?.videoUrl) {
      checkVideoOrientation(selectedVideo.videoUrl);
    }
  }, [selectedVideo]);

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
              console.warn(`Retrying after error in ${backoffDelay/1000}s (attempt ${retryCount}/${maxRetryCount})`);
              
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
          console.warn(`Error fetching progress. Retry ${retryCount}/${maxRetryCount} in ${backoffDelay/1000}s`);
          
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

  // Function to check video orientation
  const checkVideoOrientation = (videoUrl: string) => {
    const video = document.createElement('video');
    video.style.display = 'none';
    
    video.onloadedmetadata = () => {
      const isPortrait = video.videoHeight > video.videoWidth;
      setIsPortraitVideo(isPortrait);
      video.remove();
    };
    
    video.onerror = () => {
      setIsPortraitVideo(false);
      video.remove();
    };
    
    video.src = videoUrl;
    document.body.appendChild(video);
  };

  useEffect(() => {
    // Reset video loading state when a new video is selected
    if (selectedVideo) {
      setVideoLoading(true);
      
      // Add a timeout to hide the loading indicator after a reasonable time
      // This helps in case the RemotionVideo doesn't properly signal when it's loaded
      const timeoutId = setTimeout(() => {
        setVideoLoading(false);
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedVideo]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/videocaptions/history');
      
      if (!response.ok) {
        throw new Error('Failed to fetch video history');
      }
      
      const data = await response.json();
      setVideos(data.data.videos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = (video: VideoCaption) => {
    setSelectedVideo(video);
    // Reset states when selecting a new video
    setVideoLoading(true);
    setIsRendering(false);
    setRenderProgress(0);
    setRenderId(null);
    setRenderComplete(false);
    setDownloadUrl(null);
    setError(null);
    // Reset caption options to defaults
    setCaptionPosition('bottom');
    setCaptionPreset('BASIC');
  };

  const handleBack = () => {
    setSelectedVideo(null);
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
        videoUrl: selectedVideo.videoUrl,
        captions: selectedVideo.captions,
        captionAlignment: captionPosition,
        captionPreset: captionPreset,
        isPortrait: isPortraitVideo,
      };
      
      // Send the render request
      const response = await fetch('/api/lambda/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // The VideoComposition component is flexible enough to handle both 
          // TikTok videos (with images) and regular captioned videos
          id: 'TikTokVideo',
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

  // Function to handle when the video preview should start playing
  const handlePreviewClick = (e: React.MouseEvent, video: VideoCaption) => {
    e.stopPropagation(); // Prevent card click event
    handleSelectVideo(video);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[95vw] mx-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedVideo ? 'Video Preview' : 'Caption History'}
          </DialogTitle>
          <DialogDescription>
            {selectedVideo 
              ? 'Preview your video with captions' 
              : 'View your previously captioned videos'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading videos...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={fetchVideos}
            >
              Try Again
            </Button>
          </div>
        ) : selectedVideo ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <Button variant="outline" onClick={handleBack}>
                Back to History
              </Button>
              
              {renderComplete ? (
                <Button 
                  variant="default" 
                  className="flex items-center"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Video
                </Button>
              ) : isRendering ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    Rendering: {Math.round(renderProgress)}%
                  </span>
                </div>
              ) : (
                <Button 
                  onClick={handleRender} 
                  variant="default"
                  disabled={isRendering}
                >
                  Render Video
                </Button>
              )}
            </div>
            
            {isRendering && (
              <div className="w-full space-y-1">
                <Progress value={renderProgress} className="w-full h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  This may take a few minutes
                </p>
              </div>
            )}
            
            {/* Caption customization options */}
            <div className="mb-4">
              <div className="bg-muted/30 rounded-md p-4">
                <h3 className="text-sm font-medium mb-3">Caption Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="captionPosition" className="block text-xs font-medium text-muted-foreground">
                      Caption Position
                    </label>
                    <div className="relative">
                      <select
                        id="captionPosition"
                        value={captionPosition}
                        onChange={(e) => setCaptionPosition(e.target.value as 'top' | 'middle' | 'bottom')}
                        className="appearance-none w-full bg-background border border-input rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      >
                        <option value="top">Top</option>
                        <option value="middle">Middle</option>
                        <option value="bottom">Bottom</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="captionPreset" className="block text-xs font-medium text-muted-foreground">
                      Caption Preset
                    </label>
                    <div className="relative">
                      <select
                        id="captionPreset"
                        value={captionPreset}
                        onChange={(e) => setCaptionPreset(e.target.value as 'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS')}
                        className="appearance-none w-full bg-background border border-input rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      >
                        <option value="BASIC">Basic</option>
                        <option value="REVID">Revid</option>
                        <option value="HORMOZI">Hormozi</option>
                        <option value="WRAP 1">Wrap 1</option>
                        <option value="WRAP 2">Wrap 2</option>
                        <option value="FACELESS">Faceless</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Changes apply instantly to the preview and will be included when rendering.</p>
              </div>
            </div>
            
            <div className={`w-full bg-black rounded-lg overflow-hidden flex justify-center relative ${isPortraitVideo ? 'portrait-video-container' : ''}`}>
              {videoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-white">Loading video...</span>
                </div>
              )}
              <div 
                ref={remotionRef}
                className={isPortraitVideo 
                  ? "h-[70vh] max-w-[100%] mx-auto relative" 
                  : "aspect-video md:aspect-auto md:h-[60vh] max-h-[70vh] w-full relative"
                }
                onLoadStart={() => setVideoLoading(true)}
                onLoad={() => setVideoLoading(false)}
              >
                <RemotionVideo 
                  videoUrl={selectedVideo.videoUrl}
                  captions={selectedVideo.captions}
                  captionAlignment={captionPosition}
                  captionPreset={captionPreset}
                />
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <h3 className="text-lg font-semibold">{selectedVideo.title}</h3>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  {new Date(selectedVideo.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  {formatDistanceToNow(new Date(selectedVideo.createdAt), { addSuffix: true })}
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium flex items-center mb-2">
                  <FileText className="mr-2 h-4 w-4" />
                  Full Transcript
                </h4>
                <div className="bg-muted p-4 rounded-md max-h-[200px] overflow-y-auto">
                  <p className="whitespace-pre-wrap text-sm">{selectedVideo.fullText}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {videos.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <p>No captioned videos found.</p>
              </div>
            ) : (
              videos.map((video) => (
                <Card 
                  key={video._id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectVideo(video)}
                >
                  <div className="aspect-video bg-black relative flex items-center justify-center">
                    {/* Show video thumbnails with better loading */}
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                      <video 
                        src={video.videoUrl} 
                        className="w-full h-full object-contain"
                        preload="metadata"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={(e) => handlePreviewClick(e, video)}
                        className="bg-white hover:bg-white/90 text-black font-medium"
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium truncate">{video.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 