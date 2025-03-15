"use client"
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import VoiceSelector  from './components/VoiceSelector';
import VideoHistoryModal from './components/VideoHistoryModal';
import { RemotionVideo } from '@/app/remotion/RemotionVideo';

// Video Modal Component
interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string | null;
  segments: ScriptSegment[];
  captions: Array<{text: string, start: number, end: number}>;
  captionPreset: 'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS' | 'ALL';
  captionAlignment: 'top' | 'middle' | 'bottom';
  screenRatio: '1/1' | '16/9' | '9/16' | 'auto';
  audioDuration?: number;
}

const VideoModal: React.FC<VideoModalProps> = ({ 
  isOpen, 
  onClose, 
  audioUrl, 
  segments, 
  captions, 
  captionPreset, 
  captionAlignment,
  screenRatio,
  audioDuration
}) => {
  if (!isOpen) return null;
  
  // Determine aspect ratio class based on screenRatio
  let aspectRatioClass = "aspect-square"; // Default for 1/1
  if (screenRatio === '16/9') {
    aspectRatioClass = "aspect-video";
  } else if (screenRatio === '9/16') {
    aspectRatioClass = "aspect-[9/16]";
  }
  
  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    // Lock scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    // Focus trap - focus the modal content
    const modalElement = document.getElementById('video-modal-content');
    if (modalElement) {
      modalElement.focus();
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore scroll when modal is closed
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 md:p-8"
      onClick={(e) => {
        // Close modal when clicking on backdrop (outside content)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        id="video-modal-content"
        className="relative bg-black rounded-lg overflow-hidden w-full max-w-4xl focus:outline-none"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-gray-800 bg-opacity-70 text-white rounded-full hover:bg-opacity-90 transition-all"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Title (visually hidden) */}
        <h2 id="modal-title" className="sr-only">Video Preview</h2>
        
        {/* Video container */}
        <div className={`w-full ${aspectRatioClass} flex items-center justify-center bg-black`}>
          {audioUrl ? (
            <RemotionVideo
              audioUrl={audioUrl}
              duration={captions.length === 0 ? audioDuration : undefined}
              images={segments.map(segment => ({
                imageUrl: segment.imageUrl || '',
                contextText: segment.ContextText
              }))}
              captions={captions}
              captionStyle="highlightSpokenWord"
              captionPreset={captionPreset}
              captionAlignment={captionAlignment}
              screenRatio={screenRatio}
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
              <p className="text-white">Loading video...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ScriptSegment {
  ContextText: string;
  ImagePrompt: string;
  imageUrl?: string;
  audioUrl?: string;
  words?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

type ImagePreset = 'realistic' | 'sketch-color' | 'sketch-bw' | 'pixar' | 'flat-animation' | 'lego' | 'sci-fi' | 'ghibli';

const IMAGE_PRESETS = [
  { id: 'realistic', label: 'Realistic Photo' },
  { id: 'sketch-color', label: 'Color Sketch' },
  { id: 'sketch-bw', label: 'Black & White Sketch' },
  { id: 'pixar', label: 'Pixar Style' },
  { id: 'flat-animation', label: 'Flat Animation' },
  { id: 'lego', label: 'Lego Style' },
  { id: 'sci-fi', label: 'Sci-Fi Art' },
  { id: 'ghibli', label: 'Studio Ghibli' },
] as const;

export default function TikTokVideoGenPage() {
  const router = useRouter();
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<ImagePreset>('realistic');
  const [scriptSegments, setScriptSegments] = useState<ScriptSegment[]>([]);
  const [currentStep, setCurrentStep] = useState<'script' | 'processing' | 'review' | 'video-only'>('script');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);
  const [fullAudioUrl, setFullAudioUrl] = useState<string | null>(null);
  const [allWords, setAllWords] = useState<Array<{text: string, start: number, end: number}>>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  
  // Add state for video modal
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  // Add toast notification state
  const [showToast, setShowToast] = useState<boolean>(false);
  
  // Use useCallback for the modal close handler
  const handleCloseVideoModal = useCallback(() => {
    setIsVideoModalOpen(false);
  }, []);

  // Hide toast after 5 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showToast]);
  
  // Caption preset and alignment options
  const [captionPreset, setCaptionPreset] = useState<'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS' | 'ALL'>('BASIC');
  const [captionAlignment, setCaptionAlignment] = useState<'top' | 'middle' | 'bottom'>('bottom');
  
  // Add disableCaptions state
  const [disableCaptions, setDisableCaptions] = useState<boolean>(false);
  
  // Screen ratio state
  const [screenRatio, setScreenRatio] = useState<'1/1' | '16/9' | '9/16' | 'auto'>('1/1');
  const [isRatioDropdownOpen, setIsRatioDropdownOpen] = useState<boolean>(false);
  
  // State for advanced options dropdown
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState<boolean>(false);
  
  // Refs for client-side rendering
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captionsRef = useRef<HTMLDivElement | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
  };

  const processScript = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSaveStatus('idle');

      // 1. Get script segments and image prompts
      const segmentsResponse = await fetch('/api/tik-tok-video-gen/getScriptAndImagePrompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: text }),
      });

      console.log("segmentsResponse before json", segmentsResponse);

      if (!segmentsResponse.ok) {
        const errorText = await segmentsResponse.text();
        console.error('Script processing error:', errorText);
        throw new Error(`Failed to process script: ${segmentsResponse.status} ${errorText}`);
      }
      
      let segmentsData;
      try {
        segmentsData = await segmentsResponse.json();
      } catch (jsonError) {
        console.error('Failed to parse segments response as JSON:', jsonError);
        throw new Error('Invalid response format from script processing');
      }
      
      const { result } = segmentsData;
      console.log("segmentsResponse", result);
      
      if (result.length === 0) {
        throw new Error('No segments were generated from your script');
      }
      
      // 2. Generate audio for the entire script at once
      const fullScript = text; 
      
      const audioResponse = await fetch('/api/tik-tok-video-gen/getaudio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice
        }),
      });

      console.log("audioResponse", audioResponse);
      
      if (!audioResponse.ok) {
        const errorText = await audioResponse.text();
        console.error('Audio generation error:', errorText);
        throw new Error(`Failed to generate audio: ${audioResponse.status} ${errorText}`);
      }
      
      let audioData;
      try {
        audioData = await audioResponse.json();
      } catch (jsonError) {
        console.error('Failed to parse audio response as JSON:', jsonError);
        throw new Error('Invalid response format from audio generation');
      }
      
      if (!audioData || !audioData.audioUrl) {
        console.error('Invalid audio data structure:', audioData);
        throw new Error('No audio URL received');
      }
      
      setFullAudioUrl(audioData.audioUrl);
      
      // Store audio duration for video length calculation when captions are disabled
      // If duration is not provided in the API response, use a reasonable default
      const audioDuration = audioData.duration || audioData.meta?.duration || 0;
      console.log("Audio duration from API:", audioDuration);
      setAudioDuration(audioDuration);
      
      // 3. Only get captions if captions are not disabled
      let captionsData: { words: Array<{text: string, start: number, end: number}> } = { words: [] };
      
      if (!disableCaptions) {
        const captionsResponse = await fetch('/api/tik-tok-video-gen/getcaptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: audioData.audioUrl
          }),
        });
        
        if (!captionsResponse.ok) {
          const errorText = await captionsResponse.text();
          console.error('Captions generation error:', errorText);
          throw new Error(`Failed to generate captions: ${captionsResponse.status} ${errorText}`);
        }
        
        try {
          captionsData = await captionsResponse.json();
        } catch (jsonError) {
          console.error('Failed to parse captions response as JSON:', jsonError);
          throw new Error('Invalid response format from captions generation');
        }
        
        if (!captionsData || !captionsData.words || !Array.isArray(captionsData.words)) {
          console.error('Invalid captions data structure:', captionsData);
          throw new Error('Invalid captions data received');
        }
        
        setAllWords(captionsData.words);
        console.log("captionsData", captionsData);
      }
      
      // 4. Process each segment for images and assign word timings
      const processedSegments = await Promise.all(
        result.map(async (segment: any, index: number) => {
          // Generate image for each segment
          const imageResponse = await fetch('/api/tik-tok-video-gen/getImages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imagePrompt: segment.ImagePrompt,
              preset: selectedPreset, 
              screenRatio: screenRatio
            }),
          });
          
          if (!imageResponse.ok) throw new Error('Failed to generate image');
          const imageData = await imageResponse.json();
          
          // If captions are disabled, return segment without words
          if (disableCaptions) {
            return {
              ...segment,
              imageUrl: imageData.imageUrl,
              words: []
            };
          }
          
          // Calculate word timing for this segment
          const segmentText = segment.ContextText.toLowerCase();
          
          // Find the start index of this segment in the full text
          const previousSegmentsText = result
            .slice(0, index)
            .map((s: ScriptSegment) => s.ContextText)
            .join(' ')
            .toLowerCase();
          
          // Find words that belong to this segment
          const segmentWords: Array<{text: string, start: number, end: number}> = [];
          let foundSegmentStart = false;
          let wordCount = 0;
          
          for (const word of captionsData.words) {
            const lowerWord = word.text.toLowerCase();
            
            // Skip words until we find the start of our segment
            if (!foundSegmentStart) {
              if (previousSegmentsText.includes(lowerWord)) {
                continue;
              } else {
                // We've found the start of our segment
                foundSegmentStart = true;
              }
            }
            
            // Add words to our segment
            segmentWords.push(word);
            wordCount += 1;
            
            // Check if we've reached the end of our segment
            if (wordCount >= segmentText.split(/\s+/).length) {
              break;
            }
          }
          
          return {
            ...segment,
            imageUrl: imageData.imageUrl,
            words: segmentWords.length > 0 ? segmentWords : [] // Empty array if segmentation fails
          };
        })
      );
      
      setScriptSegments(processedSegments);
      
      // Automatically save to database after all content is generated
      try {
        setSaveStatus('saving');
        const saveResponse = await fetch('/api/tik-tok-video-gen/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: text,
            audioUrl: audioData.audioUrl,
            images: processedSegments,
            captions: captionsData.words,
            captionPreset,
            captionAlignment,
            disableCaptions,
            audioDuration,
            screenRatio
          }),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json();
          throw new Error(errorData.error || 'Failed to save data');
        }

        const saveResult = await saveResponse.json();
        setSaveStatus('saved');
        console.log('Data saved successfully:', saveResult);
      } catch (saveError) {
        console.error('Error saving data:', saveError);
        setSaveStatus('error');
        // Don't throw here to allow the UI to still show the generated content
      }

      // Show the video modal automatically when processing is complete
      setCurrentStep('review');
      setIsVideoModalOpen(true);
      setShowToast(true);
    } catch (err) {
      console.error('Error processing script:', err);
      setError(err instanceof Error ? err.message : 'Failed to process script');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }
    
    if (!selectedVoice) {
      setError('Please select a voice');
      return;
    }
    
    setCurrentStep('processing');
    await processScript();
  };

  // Function to play the current segment with synchronized captions
  const playCurrentSegment = () => {
    if (!scriptSegments.length || currentSegmentIndex >= scriptSegments.length || !fullAudioUrl) return;
    
    const segment = scriptSegments[currentSegmentIndex];
    if (!segment.words || segment.words.length === 0) return;
    
    if (audioRef.current) {
      // If we already have the audio element set up, just seek to the right position
      if (audioRef.current.src !== fullAudioUrl) {
        audioRef.current.src = fullAudioUrl;
      }
      
      // Seek to the start time of the first word in this segment
      const startTime = segment.words[0]?.start || 0;
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
    }
  };

  // Handle audio time update to sync captions
  const handleTimeUpdate = () => {
    if (!audioRef.current || !captionsRef.current || !scriptSegments[currentSegmentIndex]?.words) return;
    
    const currentTime = audioRef.current.currentTime;
    const currentSegment = scriptSegments[currentSegmentIndex];
    const words = currentSegment.words || [];
    
    // Check if we've moved past the current segment
    if (words.length > 0) {
      const lastWordEndTime = words[words.length - 1].end;
      if (currentTime > lastWordEndTime + 0.5) {
        // Move to next segment if we're not on the last one
        if (currentSegmentIndex < scriptSegments.length - 1) {
          setCurrentSegmentIndex(prev => prev + 1);
          return;
        }
      }
    }
    
    // Find the current word based on timing
    let currentText = '';
    for (const word of words) {
      if (currentTime >= word.start && currentTime <= word.end) {
        currentText += ` <span class="text-blue-600 font-bold">${word.text}</span>`;
      } else {
        currentText += ` ${word.text}`;
      }
    }
    
    captionsRef.current.innerHTML = currentText || currentSegment.ContextText;
  };

  // Handle audio ended event
  const handleAudioEnded = () => {
    // Reset to first segment when audio ends
    setCurrentSegmentIndex(0);
  };

  // Effect to play segment when currentSegmentIndex changes
  useEffect(() => {
    if (currentStep === 'review') {
      playCurrentSegment();
    }
  }, [currentSegmentIndex, currentStep, scriptSegments]);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'script':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                Enter your script
              </label>
              <textarea
                id="text"
                value={text}
                onChange={handleTextChange}
                placeholder="Type your script here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                rows={5}
                required
              />
            </div>
            
            <VoiceSelector onVoiceSelect={handleVoiceSelect} selectedVoice={selectedVoice} />

            {/* Advanced options dropdown */}
            <div className="border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
                className="w-full flex justify-between items-center p-4 text-left"
              >
                <h3 className="text-lg font-medium text-gray-800">Advanced options</h3>
                <svg 
                  className={`w-5 h-5 transition-transform ${advancedOptionsOpen ? 'transform rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {advancedOptionsOpen && (
                <div className="p-4 space-y-6 border-t border-gray-200">
                  {/* Screen Ratio Selection */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Choose your screen ratio
                      </label>
                      <p className="text-sm text-gray-500 mb-2">
                        Our AI will adapt the footage to your desired screen ratio
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsRatioDropdownOpen(!isRatioDropdownOpen)}
                        className="w-full flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <span>{screenRatio}</span>
                        <svg 
                          className={`w-5 h-5 transition-transform ${isRatioDropdownOpen ? 'transform rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isRatioDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 border border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              setScreenRatio('auto');
                              setIsRatioDropdownOpen(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${screenRatio === 'auto' ? 'bg-blue-50 text-blue-700' : ''}`}
                          >
                            Auto
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setScreenRatio('16/9');
                              setIsRatioDropdownOpen(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${screenRatio === '16/9' ? 'bg-blue-50 text-blue-700' : ''}`}
                          >
                            16 / 9
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setScreenRatio('9/16');
                              setIsRatioDropdownOpen(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${screenRatio === '9/16' ? 'bg-blue-50 text-blue-700' : ''}`}
                          >
                            9 / 16
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setScreenRatio('1/1');
                              setIsRatioDropdownOpen(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${screenRatio === '1/1' ? 'bg-blue-50 text-blue-700' : ''}`}
                          >
                            1 / 1
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Image Style Selector */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Image Style
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {IMAGE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedPreset(preset.id as ImagePreset)}
                          className={`p-3 text-sm rounded-lg border transition-all ${
                            selectedPreset === preset.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Disable Captions Toggle */}
                  <div className="py-2 border-t border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-medium text-gray-700">Disable Captions</h3>
                        <p className="text-sm text-gray-500">Do not show captions in your video</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={disableCaptions}
                          onChange={(e) => setDisableCaptions(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Caption Presets Selection */}
                  <div className={`space-y-2 ${disableCaptions ? 'opacity-50 pointer-events-none' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700">
                      Select a preset to add to your captions
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setCaptionPreset('BASIC')}
                        disabled={disableCaptions}
                        className={`relative p-3 text-sm rounded-lg border transition-all ${
                          captionPreset === 'BASIC'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">BASIC</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setCaptionPreset('REVID')}
                        disabled={disableCaptions}
                        className={`relative p-3 text-sm rounded-lg border transition-all ${
                          captionPreset === 'REVID'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Galaxy</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setCaptionPreset('HORMOZI')}
                        disabled={disableCaptions}
                        className={`relative p-3 text-sm rounded-lg border transition-all ${
                          captionPreset === 'HORMOZI'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-lg text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">HORMOZI</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setCaptionPreset('ALL')}
                        disabled={disableCaptions}
                        className={`relative p-3 text-sm rounded-lg border transition-all ${
                          captionPreset === 'ALL'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-lg">All</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setCaptionPreset('WRAP 1')}
                        disabled={disableCaptions}
                        className={`relative p-3 text-sm rounded-lg border transition-all ${
                          captionPreset === 'WRAP 1'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-lg text-white bg-red-500 px-2 py-1 rounded">Wrap 1</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setCaptionPreset('WRAP 2')}
                        disabled={disableCaptions}
                        className={`relative p-3 text-sm rounded-lg border transition-all ${
                          captionPreset === 'WRAP 2'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-lg text-white bg-blue-500 px-2 py-1 rounded">WRAP 2</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setCaptionPreset('FACELESS')}
                        disabled={disableCaptions}
                        className={`relative p-3 text-sm rounded-lg border transition-all ${
                          captionPreset === 'FACELESS'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-lg text-gray-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">FACELESS</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Caption Alignment Selection */}
                  <div className={`space-y-2 ${disableCaptions ? 'opacity-50 pointer-events-none' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700">
                      Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setCaptionAlignment('top')}
                        disabled={disableCaptions}
                        className={`flex items-center justify-center p-3 text-sm rounded-lg border transition-all ${
                          captionAlignment === 'top'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 9h14M5 4h14" />
                        </svg>
                        Top
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setCaptionAlignment('middle')}
                        disabled={disableCaptions}
                        className={`flex items-center justify-center p-3 text-sm rounded-lg border transition-all ${
                          captionAlignment === 'middle'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                        </svg>
                        Middle
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setCaptionAlignment('bottom')}
                        disabled={disableCaptions}
                        className={`flex items-center justify-center p-3 text-sm rounded-lg border transition-all ${
                          captionAlignment === 'bottom'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15h14M5 20h14" />
                        </svg>
                        Bottom
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                isLoading 
                  ? "bg-blue-300 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isLoading ? "Processing..." : "Generate Content"}
            </button>
          </form>
        );
      
      case 'processing':
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing your content...</p>
          </div>
        );
      
      case 'review':
        const currentSegment = scriptSegments[currentSegmentIndex];
        return (
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Preview</h2>
              <div className="flex items-center space-x-2 sm:space-x-4 mt-2 sm:mt-0">
                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View Video
                </button>
                <div className="text-sm text-gray-600">
                  Segment {currentSegmentIndex + 1} of {scriptSegments.length}
                </div>
                {/* Save status indicator */}
                {saveStatus === 'saving' && (
                  <div className="text-sm text-blue-600 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Saving...
                  </div>
                )}
                {saveStatus === 'saved' && (
                  <div className="text-sm text-green-600 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="text-sm text-red-600">
                    Failed to save
                  </div>
                )}
              </div>
            </div>
            
            {/* Responsive layout with content on left and video on right */}
            <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
              {/* Main content area - Left side on desktop, top on mobile */}
              <div className="md:flex-1 space-y-4 md:space-y-6">
                {/* Legacy Audio with captions - can be kept for backward compatibility */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <audio 
                    ref={audioRef}
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleAudioEnded}
                    className="w-full"
                  >
                    {fullAudioUrl && <source src={fullAudioUrl} type="audio/mpeg" />}
                    Your browser does not support the audio element.
                  </audio>
                  
                  {/* Captions display */}
                  <div 
                    ref={captionsRef}
                    className="p-4 bg-white rounded-md shadow-sm text-lg text-center leading-relaxed min-h-[80px]"
                  >
                    {currentSegment?.ContextText || "No captions available"}
                  </div>
                  
                  {/* Caption and screen ratio info */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 px-2">
                    <div>
                      <span className="font-medium">Style:</span> {captionPreset}
                    </div>
                    <div>
                      <span className="font-medium">Alignment:</span> {captionAlignment.charAt(0).toUpperCase() + captionAlignment.slice(1)}
                    </div>
                    <div>
                      <span className="font-medium">Ratio:</span> {screenRatio}
                    </div>
                    {disableCaptions && (
                      <div>
                        <span className="font-medium">Duration:</span> {audioDuration.toFixed(2)}s
                      </div>
                    )}
                  </div>
                  
                  {/* Navigation controls */}
                  <div className="flex justify-between pt-4">
                    <button
                      onClick={() => setCurrentSegmentIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentSegmentIndex === 0}
                      className={`px-4 py-2 rounded-md ${
                        currentSegmentIndex === 0
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      Previous
                    </button>
                    
                    <button
                      onClick={() => setCurrentSegmentIndex(prev => Math.min(scriptSegments.length - 1, prev + 1))}
                      disabled={currentSegmentIndex === scriptSegments.length - 1}
                      className={`px-4 py-2 rounded-md ${
                        currentSegmentIndex === scriptSegments.length - 1
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
                
                {/* Navigation and Edit buttons */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setCurrentStep('script')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Edit Script
                  </button>
                  <button
                    onClick={() => setIsVideoModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    View Full Video
                  </button>
                </div>
                
                {/* All segments preview */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3">All Segments</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {scriptSegments.map((segment, index) => (
                      <div 
                        key={index} 
                        className={`bg-gray-50 rounded-lg p-3 cursor-pointer transition-all ${
                          currentSegmentIndex === index ? 'ring-2 ring-blue-500' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => setCurrentSegmentIndex(index)}
                      >
                        <div className="relative w-full h-32 rounded-md overflow-hidden bg-gray-200 mb-2">
                          {segment.imageUrl && (
                            <img
                              src={segment.imageUrl}
                              alt={`Thumbnail for segment ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                            {index + 1}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{segment.ContextText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Video Preview - Right side on desktop, bottom on mobile */}
              <div className="w-full md:w-2/5 md:sticky md:top-4 self-start">
                <div className="bg-gray-50 rounded-lg p-4 flex flex-col">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Video Output</h3>
                  {/* Remotion Video Preview */}
                  <div className="w-full h-[400px] md:h-[500px] flex items-center justify-center bg-black rounded-md overflow-hidden flex-grow">
                    {fullAudioUrl && (
                      <RemotionVideo
                        audioUrl={fullAudioUrl}
                        duration={disableCaptions ? audioDuration : undefined}
                        images={scriptSegments.map(segment => ({
                          imageUrl: segment.imageUrl || '',
                          contextText: segment.ContextText
                        }))}
                        captions={disableCaptions ? [] : allWords}
                        captionStyle="highlightSpokenWord"
                        captionPreset={captionPreset}
                        captionAlignment={captionAlignment}
                        screenRatio={screenRatio}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'video-only':
        return (
          <div className="relative">
            {/* Back button */}
            <button
              onClick={() => router.push('/tik-tok-video-gen')}
              className="absolute top-4 left-4 z-10 flex items-center justify-center p-3 bg-gray-800 bg-opacity-70 text-white rounded-full hover:bg-opacity-90 transition-all"
              aria-label="Back to Generator"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            {/* Full screen video */}
            <div className="w-full h-screen max-h-screen flex items-center justify-center bg-black">
              {fullAudioUrl ? (
                <div className="w-full h-full max-w-4xl mx-auto flex items-center justify-center">
                  <RemotionVideo
                    audioUrl={fullAudioUrl}
                    duration={disableCaptions ? audioDuration : undefined}
                    images={scriptSegments.map(segment => ({
                      imageUrl: segment.imageUrl || '',
                      contextText: segment.ContextText
                    }))}
                    captions={disableCaptions ? [] : allWords}
                    captionStyle="highlightSpokenWord"
                    captionPreset={captionPreset}
                    captionAlignment={captionAlignment}
                    screenRatio={screenRatio}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                  <p className="text-white">Loading video...</p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  // Memoize video modal component to prevent unnecessary re-renders
  const MemoizedVideoModal = React.useMemo(() => (
    <VideoModal
      isOpen={isVideoModalOpen}
      onClose={handleCloseVideoModal}
      audioUrl={fullAudioUrl}
      segments={scriptSegments}
      captions={disableCaptions ? [] : allWords}
      captionPreset={captionPreset}
      captionAlignment={captionAlignment}
      screenRatio={screenRatio}
      audioDuration={audioDuration}
    />
  ), [isVideoModalOpen, fullAudioUrl, scriptSegments, allWords, disableCaptions, captionPreset, captionAlignment, screenRatio, handleCloseVideoModal, audioDuration]);

  return (
    <div className={`min-h-screen bg-gray-50 ${currentStep === 'video-only' ? 'p-0' : 'p-4 md:p-8'}`}>
      <div className={`${
        currentStep === 'video-only' 
          ? 'w-full max-w-full p-0 shadow-none rounded-none bg-black' 
          : currentStep === 'review' 
            ? 'max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6' 
            : 'max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6'
      }`}>
        {currentStep !== 'video-only' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">TikTok Content Generator</h1>
            <button 
              onClick={() => setIsHistoryModalOpen(true)} 
              className="mt-2 sm:mt-0 inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium text-sm"
            >
              <svg 
                className="w-4 h-4 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              Videos History
            </button>
          </div>
        )}
        {renderCurrentStep()}
      </div>
      
      {/* Videos History Modal */}
      {currentStep !== 'video-only' && isHistoryModalOpen && (
        <VideoHistoryModal 
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}
      
      {/* Video Output Modal - Now using memoized version */}
      {isVideoModalOpen && MemoizedVideoModal}

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 max-w-xs md:max-w-md transition-all duration-300 transform translate-y-0 opacity-100">
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium">Video is ready!</p>
            <p className="text-sm opacity-90">Your TikTok video has been generated successfully.</p>
          </div>
          <button 
            onClick={() => setShowToast(false)}
            className="ml-auto flex-shrink-0 text-white"
            aria-label="Close notification"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
} 