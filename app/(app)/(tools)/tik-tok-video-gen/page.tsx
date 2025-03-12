"use client"
import React, { useState, useRef, useEffect } from 'react';
import VoiceSelector from '../../../components/VoiceSelector';
import VideoHistoryModal from '../../../components/VideoHistoryModal';
import { Trash2 } from 'lucide-react';


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
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<ImagePreset>('realistic');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [scriptSegments, setScriptSegments] = useState<ScriptSegment[]>([]);
  const [currentStep, setCurrentStep] = useState<'script' | 'processing' | 'review'>('script');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);
  const [fullAudioUrl, setFullAudioUrl] = useState<string | null>(null);
  const [allWords, setAllWords] = useState<Array<{text: string, start: number, end: number}>>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [showVideoHistory, setShowVideoHistory] = useState<boolean>(false);
  
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

  const handleVoiceSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVoiceSpeed(parseFloat(e.target.value));
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
          voiceId: selectedVoice,
          speed: voiceSpeed
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
      
      // 3. Get captions for the full audio
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
      
      let captionsData;
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
      
      // 4. Process each segment for images and assign word timings
      const processedSegments = await Promise.all(
        result.map(async (segment: any, index: number) => {
          // Generate image for each segment
          const imageResponse = await fetch('/api/tik-tok-video-gen/getImages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imagePrompt: segment.ImagePrompt,
              preset: selectedPreset
            }),
          });
          
          if (!imageResponse.ok) throw new Error('Failed to generate image');
          const imageData = await imageResponse.json();
          
          // Calculate word timing for this segment
          const segmentText = segment.ContextText.toLowerCase();
          
          // Find the start index of this segment in the full text
          const previousSegmentsText = result
            .slice(0, index)
            .map((s: ScriptSegment) => s.ContextText)
            .join(' ')
            .toLowerCase();
          
          // Find words that belong to this segment
          const segmentWords = [];
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
      
      // Save to database and automatically start video generation
      try {
        setSaveStatus('saving');
        
        // Prepare data for saving
        const data = {
          script: text,
          audioUrl: fullAudioUrl,
          images: processedSegments.map(segment => ({
            contextText: segment.ContextText,
            imageUrl: segment.imageUrl
          })),
          captions: captionsData.words
        };
        
        // Send to API
        const response = await fetch('/api/tik-tok-video-gen/videos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error('Failed to save video data');
        }
        
        const result = await response.json();
        setVideoId(result.videoId);
        setSaveStatus('saved');

        // Automatically start video generation
        console.log('Starting automatic video generation for videoId:', result.videoId);
        const generateResponse = await fetch('/api/tik-tok-video-gen/generate-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ videoId: result.videoId })
        });
        
        if (!generateResponse.ok) {
          const errorData = await generateResponse.json();
          throw new Error(errorData.error || 'Failed to generate video');
        }
        
        const generateResult = await generateResponse.json();
        if (generateResult.success) {
          alert('Video generation started! You can check the status in the Video History.');
        }

      } catch (error) {
        console.error('Error saving and generating video:', error);
        setSaveStatus('error');
        throw error;
      }

      setCurrentStep('review');
    } catch (error) {
      console.error('Error processing script:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
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

  const saveToDatabase = async () => {
    try {
      setSaveStatus('saving');
      
      // Prepare data for saving
      const data = {
        script: text,
        audioUrl: fullAudioUrl,
        images: scriptSegments.map(segment => ({
          contextText: segment.ContextText,
          imageUrl: segment.imageUrl
        })),
        captions: allWords
      };
      
      // Send to API
      const response = await fetch('/api/tik-tok-video-gen/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save video data');
      }
      
      const result = await response.json();
      setVideoId(result.videoId);
      setSaveStatus('saved');
      
      return result.videoId;
    } catch (error) {
      console.error('Error saving video data:', error);
      setSaveStatus('error');
      throw error;
    }
  };
  
  const generateVideo = async () => {
    try {
      // First save the data if not already saved
      let id = videoId;
      if (!id) {
        id = await saveToDatabase();
      }
      
      // Now generate the video
      setIsLoading(true);
      const response = await fetch('/api/tik-tok-video-gen/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoId: id })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate video');
      }
      
      const result = await response.json();
      alert('Video generation started! You can check the status in the Video History.');
      
    } catch (error) {
      console.error('Error generating video:', error);
      alert('Failed to generate video: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const openVideoHistory = () => {
    setShowVideoHistory(true);
  };

  const deleteVideo = async () => {
    if (!videoId) {
      // If no video ID, just reset the form
      setText('');
      setSelectedVoice('');
      setVoiceSpeed(1.0);
      setSelectedPreset('realistic');
      return;
    }

    try {
      const response = await fetch(`/api/tik-tok-video-gen/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      // Reset all states
      setText('');
      setSelectedVoice('');
      setVoiceSpeed(1.0);
      setSelectedPreset('realistic');
      setVideoId(null);
      setScriptSegments([]);
      setFullAudioUrl(null);
      setAllWords([]);
      setSaveStatus('idle');
      setCurrentStep('script');

      // Show success message
      alert('Video deleted successfully');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'script':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="script" className="block text-sm font-medium text-gray-700">
                Enter your script
              </label>
              <textarea
                id="script"
                rows={6}
                className="w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter your TikTok script here..."
                value={text}
                onChange={handleTextChange}
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Voice</label>
                <VoiceSelector onVoiceSelect={handleVoiceSelect} selectedVoice={selectedVoice} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Voice Speed</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={voiceSpeed}
                    onChange={handleVoiceSpeedChange}
                    className="w-full"
                  />
                  <span className="text-sm">{voiceSpeed}x</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Image Style</label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      selectedPreset === preset.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between">
  
              
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text || !selectedVoice}
                className={`rounded-md px-4 py-2 w-full text-sm font-medium ${
                  !text || !selectedVoice
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Process Script
              </button>
            </div>
          </div>
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
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Preview</h3>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this video?')) {
                      deleteVideo();
                    }
                  }}
                  className="rounded-md bg-red-50 p-2 text-red-600 hover:bg-red-100 transition-colors"
                  title="Delete video"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    {currentSegment?.imageUrl ? (
                      <img
                        src={currentSegment.imageUrl}
                        alt={currentSegment.ContextText}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-gray-500">No image generated</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentSegmentIndex(Math.max(0, currentSegmentIndex - 1))}
                      disabled={currentSegmentIndex === 0}
                      className={`rounded-md px-3 py-1 text-sm ${
                        currentSegmentIndex === 0
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <span className="text-sm text-gray-500">
                      {currentSegmentIndex + 1} of {scriptSegments.length}
                    </span>
                    
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentSegmentIndex(Math.min(scriptSegments.length - 1, currentSegmentIndex + 1))
                      }
                      disabled={currentSegmentIndex === scriptSegments.length - 1}
                      className={`rounded-md px-3 py-1 text-sm ${
                        currentSegmentIndex === scriptSegments.length - 1
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm text-gray-700">{currentSegment?.ContextText}</p>
                  </div>
                  
                  {fullAudioUrl && (
                    <div>
                      <audio
                        ref={audioRef}
                        src={fullAudioUrl}
                        controls
                        className="w-full"
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleAudioEnded}
                      />
                      
                      <div
                        ref={captionsRef}
                        className="mt-2 min-h-[3rem] rounded-md bg-gray-800 p-3 text-center text-lg font-medium text-white"
                      >
                        {/* Captions will appear here */}
                      </div>
                    </div>
                  )}
                  
                  <canvas
                    ref={canvasRef}
                    width="400"
                    height="100"
                    className="w-full rounded-md border border-gray-200"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep('script')}
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                >
                  Back to Script
                </button>
                
                <div className="space-x-3">
                  <button
                    type="button"
                    onClick={saveToDatabase}
                    disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                    className={`rounded-md px-4 py-2 text-sm font-medium ${
                      saveStatus === 'saving'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : saveStatus === 'saved'
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {saveStatus === 'saving'
                      ? 'Saving...'
                      : saveStatus === 'saved'
                      ? 'Saved!'
                      : 'Save'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={generateVideo}
                    disabled={isLoading || saveStatus === 'saving' || saveStatus === 'idle'}
                    className={`rounded-md px-4 py-2 text-sm font-medium ${
                      isLoading || saveStatus === 'saving' || saveStatus === 'idle'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isLoading ? 'Generating...' : 'Generate Video'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">TikTok Video Generator</h1>
      
      {renderCurrentStep()}
      
      <VideoHistoryModal 
        isOpen={showVideoHistory} 
        onClose={() => setShowVideoHistory(false)} 
      />
    </div>
  );
} 