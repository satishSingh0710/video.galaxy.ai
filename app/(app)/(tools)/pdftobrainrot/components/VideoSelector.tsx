"use client";

import { useState, useEffect } from 'react';
import bgvideos from '@/bgvideos/bgvideos';
import { useRef } from 'react';

interface VideoSelectorProps {
  onVideoSelect: (videoUrl: string) => void;
  selectedVideoUrl: string | null;
}

export default function VideoSelector({ onVideoSelect, selectedVideoUrl }: VideoSelectorProps) {
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const categories = [
    { id: 'Satisfying', label: 'Satisfying' },
    { id: 'UGC', label: 'UGC' },
    { id: 'subwaysurfer', label: 'Subway S.' },
    { id: 'Minecraft', label: 'Minecraft' },
    { id: 'Fortnite', label: 'Fortnite' },
    { id: 'Trackmania', label: 'Trackmania' },
    { id: 'Space', label: 'Space' },
  ];

  const handleMouseEnter = (videoUrl: string) => {
    setHoveredVideo(videoUrl);
    const videoElement = videoRefs.current[videoUrl];
    if (videoElement) {
      videoElement.play().catch(error => console.log('Video play error:', error));
    }
  };

  const handleMouseLeave = (videoUrl: string) => {
    setHoveredVideo(null);
    const videoElement = videoRefs.current[videoUrl];
    if (videoElement) {
      videoElement.pause();
      videoElement.currentTime = 0;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium mb-2">Select Background Video</div>
      
      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all
              ${category.id === 'subwaysurfer' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
        {isMounted && bgvideos.map((video) => (
          <div
            key={video.id}
            className={`relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer border-2 transition-all
              ${selectedVideoUrl === video.videoUrl ? 'border-primary' : 'border-transparent'}
              hover:border-primary/50`}
            onMouseEnter={() => handleMouseEnter(video.videoUrl)}
            onMouseLeave={() => handleMouseLeave(video.videoUrl)}
            onClick={() => onVideoSelect(video.videoUrl)}
          >
            <video
              ref={(el) => {
                if (el) {
                  videoRefs.current[video.videoUrl] = el;
                }
              }}
              src={video.videoUrl}
              className="w-full h-full object-cover"
              loop
              muted
              playsInline
              preload="metadata"
            />
            {selectedVideoUrl === video.videoUrl && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="bg-white rounded-full p-2">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 