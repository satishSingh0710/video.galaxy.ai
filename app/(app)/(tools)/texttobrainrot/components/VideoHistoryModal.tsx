'use client';

import { useState, useEffect } from 'react';
import { X, Play, Download, Clock, Calendar, FileText, Loader2, Trash2 } from 'lucide-react';
import { RemotionVideo } from '@/app/remotion/RemotionVideo';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Video {
  _id: string;
  textName: string;
  inputText: string;
  script: string;
  audioUrl: string;
  duration: number;
  bgVideo: string;
  createdAt: string;
  captions: Array<{
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

  // Rendering states
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [renderComplete, setRenderComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

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
        if (selectedVideo.duration) {
          setAudioDuration(selectedVideo.duration);
        } else {
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
    const baseDelay = 10000;

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
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
            console.warn(`Rate limited (status code). Retrying in ${retryAfter} seconds`);
            if (intervalId) clearInterval(intervalId);
            retryTimeoutId = setTimeout(() => {
              startPolling(baseDelay * Math.pow(2, Math.min(retryCount, 4)));
            }, retryAfter * 1000);
            return;
          }
        }

        const data = await response.json();

        if (data.type === 'error') {
          if (data.retryable && retryCount <= maxRetryCount) {
            retryCount++;
            const backoffDelay = baseDelay * Math.pow(2, retryCount - 1);
            if (intervalId) clearInterval(intervalId);
            retryTimeoutId = setTimeout(() => {
              startPolling(Math.min(baseDelay * Math.pow(2, retryCount), 30000));
            }, backoffDelay);
            return;
          }
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
          retryCount = 0;
        }
      } catch (err) {
        console.error('Error checking render progress:', err);
        retryCount++;
        if (retryCount <= maxRetryCount) {
          if (intervalId) clearInterval(intervalId);
          const backoffDelay = baseDelay * Math.pow(2, retryCount - 1);
          retryTimeoutId = setTimeout(() => {
            startPolling(Math.min(baseDelay * Math.pow(2, retryCount), 30000));
          }, backoffDelay);
          return;
        } else {
          setError('Failed to check rendering progress after multiple attempts');
          setIsRendering(false);
        }
      }
    };

    const startPolling = (interval: number) => {
      retryTimeoutId = setTimeout(() => {
        checkProgress();
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
      const response = await fetch('/api/texttobrainrot/history');
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      const data = await response.json();
      setVideos(data.data.videos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching videos');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
    setCaptionPreset(video.captionPreset || 'BASIC');
    setCaptionAlignment(video.captionAlignment || 'bottom');
    
    // Reset rendering states
    setRenderComplete(false);
    setDownloadUrl(null);
    setRenderId(null);
    setRenderProgress(0);
    setIsRendering(false);
  };

  const handleBack = () => {
    setSelectedVideo(null);
    setRenderComplete(false);
    setDownloadUrl(null);
    setRenderId(null);
    setRenderProgress(0);
    setIsRendering(false);
  };

  const handleRender = async () => {
    if (!selectedVideo) return;
    
    try {
      setIsRendering(true);
      setRenderProgress(0);
      setRenderComplete(false);
      setDownloadUrl(null);
      setError(null);
      
      const inputProps = {
        audioUrl: selectedVideo.audioUrl,
        captions: selectedVideo.captions,
        captionAlignment,
        captionPreset,
        bgVideo: selectedVideo.bgVideo,
        screenRatio: selectedVideo.screenRatio || '9/16',
      };
      
      const response = await fetch('/api/lambda/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 'TextBrainrotVideo',
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

  const handleDeleteVideo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVideoToDelete(id);
  };

  const confirmDelete = async () => {
    if (!videoToDelete) return;
    
    try {
      setDeletingId(videoToDelete);
      const response = await fetch(`/api/texttobrainrot/delete?id=${videoToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete video');
      }
      
      // Remove the deleted video from the list
      setVideos(videos.filter(video => video._id !== videoToDelete));
      setVideoToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the video');
      console.error('Error deleting video:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const cancelDelete = () => {
    setVideoToDelete(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[95vw] mx-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedVideo ? 'Video Preview' : 'Text to Video History'}
            </DialogTitle>
            <DialogDescription>
              {selectedVideo 
                ? 'Preview your video with captions' 
                : 'View your previously generated videos'}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-blue-600"></div>
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
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-blue-600"></div>
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
              
              <div className="flex flex-col md:flex-row gap-6 mb-4">
                {/* Video player container */}
                <div className="w-full md:w-2/3 flex items-center justify-center">
                  {audioLoading ? (
                    <div className="w-full flex items-center justify-center bg-gray-100 rounded-lg p-4">
                      <div className="text-center">
                        <div className="h-8 w-8 mx-auto border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading video...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-center">
                      <div className="aspect-[9/16] w-full max-w-[280px] rounded-lg overflow-hidden">
                        <RemotionVideo
                          audioUrl={selectedVideo.audioUrl}
                          duration={audioDuration || selectedVideo.duration}
                          captions={selectedVideo.captions}
                          captionPreset={captionPreset}
                          captionAlignment={captionAlignment}
                          videoUrl={selectedVideo.bgVideo}
                          screenRatio={selectedVideo.screenRatio || '9/16'}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls - positioned on right side */}
                <div className="w-full md:w-1/3 flex flex-col space-y-4">
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
                </div>
              </div>
              
              <div className="mt-4 space-y-2">

              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {videos.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <p>No videos found.</p>
                </div>
              ) : (
                videos.map((video) => (
                  <Card 
                    key={video._id} 
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectVideo(video)}
                  >
                    <div className="aspect-[9/16] bg-black relative flex items-center justify-center">
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <video 
                          src={video.bgVideo} 
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Button 
                          variant="secondary" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleSelectVideo(video); }}
                          className="bg-white/80 hover:bg-white text-black rounded-full h-10 w-10"
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="max-w-[70%]">
                          <h3 className="font-medium text-sm">
                            {video.textName.length > 12 
                              ? `${video.textName.substring(0, 18)}...` 
                              : video.textName}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0"
                          onClick={(e) => handleDeleteVideo(video._id, e)}
                          disabled={deletingId === video._id}
                        >
                          {deletingId === video._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!videoToDelete} onOpenChange={(open: boolean) => !open && setVideoToDelete(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deletingId === videoToDelete ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 