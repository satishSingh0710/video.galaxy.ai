'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Video, Check, AlertCircle } from 'lucide-react';

interface FormData {
  script: string;
  voiceId?: string;
}

interface VideoGenerationResponse {
  videoUrl: string;
  segments: Array<{
    contextText: string;
    imageUrl: string;
    audioUrl: string;
    words: Array<{
      text: string;
      start: number;
      end: number;
    }>;
  }>;
  audioUrl: string;
}

const TikTokVideoGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<VideoGenerationResponse | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setVideoData(null);
      
      // Update steps to show progress
      setCurrentStep('Analyzing script and generating segments...');
      
      console.log('Submitting script:', data.script);

      // Add a delay to simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch('/api/tik-tok-video-gen/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
      }

      // Update progress
      setCurrentStep('Processing response...');
      
      // Add a delay to simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const responseData = await response.json();
      console.log('Received response:', responseData);
      
      // Validate response data
      if (!responseData) {
        throw new Error('Empty response from server');
      }
      
      // Check for segments property first
      if (responseData.segments && Array.isArray(responseData.segments)) {
        // If segments property exists and is an array, use it
        console.log('Found segments array in response:', responseData.segments.length);
      } else {
        // If no segments property, create an empty array to prevent errors
        console.warn('Response missing segments array:', responseData);
        responseData.segments = [];
      }
      
      if (!responseData.videoUrl) {
        console.error('Invalid response data:', responseData);
        throw new Error('Response missing video URL');
      }
      
      setVideoData(responseData);
      setCurrentStep('Video generation complete!');
      
      // Scroll to the video player
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
      
    } catch (err) {
      console.error('Error generating video:', err);
      
      // Provide a more user-friendly error message based on the error
      let errorMessage = 'An unexpected error occurred';
      
      if (err instanceof Error) {
        // If it's a network error
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Network error: Please check your internet connection and try again.';
        } 
        // If it's a server error
        else if (err.message.includes('Server error') || err.message.includes('500')) {
          errorMessage = 'Server error: The video generation service is currently experiencing issues. Please try again later.';
        }
        // If it's a specific error from our API
        else if (err.message.includes('Failed to generate')) {
          errorMessage = err.message;
        }
        // For any other error, use the error message
        else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setCurrentStep('Error occurred');
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

  // Function to update the current step (can be called from event listeners)
  const updateCurrentStep = (step: string) => {
    setCurrentStep(step);
  };

  // Listen for server-sent events to update progress (if implemented)
  // useEffect(() => {
  //   const eventSource = new EventSource('/api/tik-tok-video-gen/progress');
  //   eventSource.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     updateCurrentStep(data.step);
  //   };
  //   return () => eventSource.close();
  // }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">TikTok Video Generator</h1>
        <p className="text-gray-600">Enter your script and we'll generate a TikTok-style video with AI-generated images and narration.</p>
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

          {/* Voice selection could be added here if you have a list of available voices */}
          {/* <div>
            <label htmlFor="voiceId" className="block text-sm font-medium text-gray-700 mb-1">
              Voice
            </label>
            <select
              id="voiceId"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              {...register('voiceId')}
              disabled={isLoading}
            >
              <option value="">Default Voice</option>
              <option value="voice1">Voice 1</option>
              <option value="voice2">Voice 2</option>
            </select>
          </div> */}

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
              'Generate Video'
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
            <h2 className="text-xl font-semibold">Your Video is Ready!</h2>
          </div>
          
          <div className="aspect-[9/16] w-full max-w-sm mx-auto bg-black rounded-lg overflow-hidden mb-4">
            <video 
              controls 
              className="w-full h-full" 
              src={videoData.videoUrl}
              poster={videoData.segments && videoData.segments.length > 0 && videoData.segments[0]?.imageUrl ? 
                videoData.segments[0].imageUrl : undefined}
            >
              Your browser does not support the video tag.
            </video>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
            <a 
              href={videoData.videoUrl} 
              download="tiktok-video.mp4"
              className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Video className="mr-2 h-4 w-4" />
              Download Video
            </a>
            {videoData.audioUrl && (
              <a 
                href={videoData.audioUrl} 
                download="audio.mp3"
                className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Download Audio
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TikTokVideoGenerator; 