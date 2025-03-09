"use client"
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import VoiceSelector from '../../../components/VoiceSelector';
import AudioPlayer from '../../../components/AudioPlayer';
import VideoPlayer from '../../../components/VideoPlayer';

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

export default function TikTokVideoGenPage() {
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [scriptSegments, setScriptSegments] = useState<ScriptSegment[]>([]);
  const [currentStep, setCurrentStep] = useState<'script' | 'processing' | 'review'>('script');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);
  const [fullAudioUrl, setFullAudioUrl] = useState<string | null>(null);
  const [allWords, setAllWords] = useState<Array<{text: string, start: number, end: number}>>([]);
  
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
              imagePrompt: segment.ImagePrompt
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
      setCurrentStep('review');

      console.log("processedSegments", processedSegments);
      
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
          <div className="space-y-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Preview</h2>
              <div className="text-sm text-gray-600">
                Segment {currentSegmentIndex + 1} of {scriptSegments.length}
              </div>
            </div>
            
            {/* Client-side rendering area */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-6">
              {/* Image display */}
              {currentSegment?.imageUrl && (
                <div className="relative w-full h-64 md:h-80 rounded-md overflow-hidden bg-gray-200">
                  <img
                    src={currentSegment.imageUrl}
                    alt={`Generated image for segment ${currentSegmentIndex + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // If image fails to load, replace with a placeholder
                      const imgElement = e.currentTarget;
                      imgElement.onerror = null; // Prevent infinite error loop
                      imgElement.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%23999'%3EImage unavailable%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              )}
              
              {/* Audio with captions */}
              <div className="space-y-3">
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
            
            {/* All segments preview */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">All Segments</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
            
            <div className="flex justify-end space-x-4 pt-6">
              <button
                onClick={() => setCurrentStep('script')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Edit Script
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">TikTok Content Generator</h1>
        {renderCurrentStep()}
      </div>
    </div>
  );
} 