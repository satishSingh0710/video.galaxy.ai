"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Clock, FileText } from "lucide-react";
import { RemotionVideo } from "@/app/remotion/RemotionVideo";
import { formatDistanceToNow } from "date-fns";

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
  };

  const handleBack = () => {
    setSelectedVideo(null);
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
            <Button variant="outline" onClick={handleBack} className="mb-4">
              Back to History
            </Button>
            
            <div className={`w-full bg-black rounded-lg overflow-hidden flex justify-center ${isPortraitVideo ? 'portrait-video-container' : ''}`}>
              <div className={isPortraitVideo 
                ? "h-[70vh] max-w-[100%] mx-auto" 
                : "aspect-video md:aspect-auto md:h-[60vh] max-h-[70vh] w-full"
              }>
                <RemotionVideo 
                  videoUrl={selectedVideo.videoUrl}
                  captions={selectedVideo.captions}
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
                    <video 
                      src={video.videoUrl} 
                      className="w-full h-full object-contain"
                      poster={`https://image.mux.com/${video.videoUrl.split('/').pop()}/thumbnail.jpg`}
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Button variant="secondary" size="sm">
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