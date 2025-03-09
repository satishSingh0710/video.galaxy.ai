"use client"
import React, { useState, useEffect } from 'react';

interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
  labels?: {
    accent?: string;
    age?: string;
    gender?: string;
    use_case?: string;
    description?: string;
  };
}

interface VoiceSelectorProps {
  onVoiceSelect: (voiceId: string) => void;
  selectedVoice: string;
}

export default function VoiceSelector({ onVoiceSelect, selectedVoice }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/tik-tok-video-gen/getaudio');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setVoices(data.voices || []);
      } catch (err) {
        console.error('Error fetching voices:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch voices');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVoices();
  }, []);

  useEffect(() => {
    // Create audio element for previews
    const audio = new Audio();
    audio.addEventListener('ended', () => setAudioPlaying(null));
    setAudioRef(audio);
    
    return () => {
      audio.pause();
      audio.removeEventListener('ended', () => setAudioPlaying(null));
    };
  }, []);

  const playPreview = (voiceId: string, previewUrl?: string) => {
    if (!previewUrl || !audioRef) return;
    
    if (audioPlaying) {
      audioRef.pause();
    }
    
    audioRef.src = previewUrl;
    audioRef.play();
    setAudioPlaying(voiceId);
  };

  const filteredVoices = voices.filter(voice => 
    voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (voice.labels?.accent && voice.labels.accent.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (voice.labels?.gender && voice.labels.gender.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="my-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-4 p-3 bg-red-100 text-red-700 rounded-md">
        Error loading voices: {error}
      </div>
    );
  }

  return (
    <div className="my-4">
      <label htmlFor="voice-search" className="block text-sm font-medium text-gray-700 mb-2">
        Select a voice
      </label>
      
      <div className="mb-4">
        <input
          type="text"
          id="voice-search"
          placeholder="Search voices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
        />
      </div>
      
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
        {filteredVoices.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No voices found matching your search
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredVoices.map((voice) => (
              <li 
                key={voice.voice_id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedVoice === voice.voice_id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => onVoiceSelect(voice.voice_id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-800">{voice.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {voice.labels?.gender && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {voice.labels.gender}
                        </span>
                      )}
                      {voice.labels?.accent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {voice.labels.accent}
                        </span>
                      )}
                      {voice.labels?.age && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {voice.labels.age}
                        </span>
                      )}
                    </div>
                    {voice.labels?.description && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{voice.labels.description}</p>
                    )}
                  </div>
                  
                  {voice.preview_url && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPreview(voice.voice_id, voice.preview_url);
                      }}
                      className={`ml-4 p-2 rounded-full ${
                        audioPlaying === voice.voice_id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      aria-label={audioPlaying === voice.voice_id ? "Stop preview" : "Play preview"}
                    >
                      {audioPlaying === voice.voice_id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {selectedVoice && (
        <div className="mt-2 text-sm text-gray-500">
          Selected voice ID: {selectedVoice}
        </div>
      )}
    </div>
  );
} 