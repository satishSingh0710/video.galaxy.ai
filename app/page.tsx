import Link from 'next/link';
import AudioCaptionForm from './components/AudioCaptionForm';

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Audio Caption Generator</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Enter an audio URL to generate captions
          </p>
        </div>
        
        <AudioCaptionForm />

        <div className="text-center mt-8 space-y-4">
          <Link 
            href="/tik-tok-video-gen"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 block"
          >
            Try TikTok Video Generator →
          </Link>
          
          <Link 
            href="/test-video"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 block"
          >
            Test Video Rendering →
          </Link>
          
          <Link 
            href="/test-keys"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 block"
          >
            Check API Keys →
          </Link>
        </div>
      </div>
    </div>
  );
}