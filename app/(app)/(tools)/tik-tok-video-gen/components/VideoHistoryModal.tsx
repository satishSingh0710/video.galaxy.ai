'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Play, Download, Clock, Calendar } from 'lucide-react';
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

interface Video {
  _id: string;
  title: string;
  script: string;
  audioUrl: string;
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
  const [captionStyle, setCaptionStyle] = useState<'default' | 'highlightEachWord' | 'highlightSpokenWord' | 'wordByWord'>('default');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedVideo?.audioUrl) {
      const audio = new Audio(selectedVideo.audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
      });
      return () => {
        audio.remove();
      };
    }
  }, [selectedVideo?.audioUrl]);

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
        captions: video.captions || []
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
    setSelectedVideo(video);
    setShowPlayer(true);
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
          {/* Background overlay */}
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm" 
            onClick={onClose}
          />

          {/* Modal panel */}
          <div className="inline-block w-full max-w-7xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
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
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Your Videos
              </h3>
              
              <ScrollArea className="h-[70vh] w-full rounded-md">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-blue-600"></div>
                  </div>
                ) : error ? (
                  <p className="py-8 text-center text-red-500">{error}</p>
                ) : videos.length === 0 ? (
                  <p className="py-8 text-center text-gray-500">No videos found</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
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
                          <h4 className="font-semibold text-lg mb-2 line-clamp-1">
                            {video.title}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {video.script}
                          </p>
                          
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
          <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
          <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
            <DialogHeader className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold">
                {selectedVideo?.title || 'Video Preview'}
              </DialogTitle>
              <button
                onClick={() => setSelectedVideo(null)}
                className="rounded-full p-2 hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </DialogHeader>
            
            <div className="aspect-[9/16] w-full max-w-sm mx-auto relative">
              <div className="absolute top-4 right-4 z-10">
                <div className="relative">
                  <select
                    id="captionStyle"
                    value={captionStyle}
                    onChange={(e) => setCaptionStyle(e.target.value as any)}
                    className="appearance-none bg-black/50 backdrop-blur-sm text-white border border-white/20 rounded-md py-2 pl-3 pr-10 text-sm font-medium hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                  >
                    <option value="default">Default Captions</option>
                    <option value="highlightEachWord">Highlight Each Word</option>
                    <option value="highlightSpokenWord">Highlight Spoken Word</option>
                    <option value="wordByWord">Word by Word</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <Player
                component={RemotionVideo}
                durationInFrames={Math.max(
                  // Duration based on the last caption end time
                  Math.ceil((selectedVideo.captions?.[selectedVideo.captions.length - 1]?.end || 0) / 1000 * 30),
                  // Duration based on audio duration
                  Math.ceil((audioDuration || 10) * 30),
                  // Minimum duration for images
                  300
                )}
                fps={30}
                compositionWidth={1080}
                compositionHeight={1920}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                controls
                inputProps={{
                  audioUrl: selectedVideo?.audioUrl || '',
                  images: selectedVideo?.images || [],
                  captions: selectedVideo?.captions || [],
                  captionStyle,
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 