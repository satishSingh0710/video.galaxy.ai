'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Video, Check, AlertCircle } from 'lucide-react';

interface FormData {
  script: string;
}

const TestVideoGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<any | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const videoRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setVideoData(null);
      
      // Update steps to show progress
      setCurrentStep('Analyzing script...');
      
      console.log('Processing script:', data.script);

      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create test data
      const testData = {
        videoUrl: "https://via.placeholder.com/1080x1920.mp4?text=Test+Video",
        segments: [
          {
            contextText: "First part of the script: " + data.script.substring(0, 50),
            imageUrl: "https://via.placeholder.com/1024x1024.png?text=Test+Image+1",
            words: [
              { text: "First", start: 0, end: 0.5 },
              { text: "part", start: 0.5, end: 1.0 },
              { text: "of", start: 1.0, end: 1.2 },
              { text: "the", start: 1.2, end: 1.4 },
              { text: "script", start: 1.4, end: 2.0 }
            ]
          },
          {
            contextText: "Second part of the script: " + data.script.substring(50, 100),
            imageUrl: "https://via.placeholder.com/1024x1024.png?text=Test+Image+2",
            words: [
              { text: "Second", start: 2.0, end: 2.5 },
              { text: "part", start: 2.5, end: 3.0 },
              { text: "of", start: 3.0, end: 3.2 },
              { text: "the", start: 3.2, end: 3.4 },
              { text: "script", start: 3.4, end: 4.0 }
            ]
          }
        ],
        audioUrl: "https://example.com/test-audio.mp3"
      };
      
      setCurrentStep('Processing complete!');
      setVideoData(testData);
      
      // Scroll to the video player
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
      // Don't clear the step if there was an error
      if (!error) {
        setTimeout(() => {
          setCurrentStep('');
        }, 2000);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Test Video Generator</h1>
        <p className="text-gray-600">Enter your script and we'll generate a test video.</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="script" className="block text-sm font-medium text-gray-700 mb-1">
              Your Video Script
            </label>
            <textarea
              id="script"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your script here. For example: 'India is the best country in the world. It has a rich culture and beautiful landscapes.'"
              {...register('script', { required: 'Script is required' })}
              disabled={isLoading}
            />
            {errors.script && (
              <p className="mt-1 text-sm text-red-600">{errors.script.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Generating Video...
              </>
            ) : (
              'Generate Test Video'
            )}
          </button>
        </form>
      </div>

      {/* Progress indicator */}
      {isLoading && currentStep && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <Loader2 className="animate-spin mr-3 h-5 w-5 text-blue-500" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Processing</h3>
              <p className="text-sm text-blue-600">{currentStep}</p>
            </div>
          </div>
          <div className="mt-3 w-full bg-blue-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Video player */}
      {videoData && videoData.videoUrl && (
        <div className="bg-white rounded-lg shadow-md p-6" ref={videoRef}>
          <div className="flex items-center mb-4">
            <Check className="h-5 w-5 text-green-500 mr-2" />
            <h2 className="text-xl font-semibold">Your Test Video is Ready!</h2>
          </div>
          
          <div className="aspect-[9/16] w-full max-w-sm mx-auto bg-black rounded-lg overflow-hidden mb-4">
            <div className="w-full h-full flex items-center justify-center text-white">
              This is a test video placeholder
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium mb-2">Generated Segments:</h3>
            <div className="space-y-4">
              {videoData.segments.map((segment: any, index: number) => (
                <div key={index} className="border rounded p-3">
                  <p className="font-medium">Segment {index + 1}</p>
                  <p className="text-sm text-gray-600 mt-1">{segment.contextText}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestVideoGenerator; 