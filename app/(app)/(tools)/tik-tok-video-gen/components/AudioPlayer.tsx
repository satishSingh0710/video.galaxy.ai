"use client";

import React, { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
  subtitle?: string | null;
  className?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, subtitle, className = '' }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset state when src changes
    setIsPlaying(false);
    setLoading(true);
    setError(null);
    setCurrentTime(0);

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError("Failed to load audio file");
      setLoading(false);
    };

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Clean up event listeners
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [src]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className={`bg-gray-100 p-3 rounded-md ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {loading ? (
        <div className="flex justify-center items-center h-12">
          <div className="animate-pulse text-gray-500">Loading audio...</div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button 
              onClick={togglePlayPause}
              className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <rect x="6" y="5" width="3" height="10" rx="1" />
                  <rect x="11" y="5" width="3" height="10" rx="1" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            
            <div className="text-xs text-gray-500 w-24 text-right">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          <div className="w-full">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              disabled={loading || !!error}
            />
          </div>

          {subtitle && (
            <div className="mt-3 p-2 bg-gray-200 rounded-md text-sm text-gray-800 max-h-24 overflow-y-auto">
              <p className="font-medium text-xs text-gray-500 mb-1">Subtitle:</p>
              <p>{subtitle}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer; 