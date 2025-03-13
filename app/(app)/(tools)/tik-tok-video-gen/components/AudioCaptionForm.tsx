'use client';

import { useState } from 'react';

interface AudioCaptionFormProps {
  onAudioUrlSubmit: (audioUrl: string) => void;
}

export default function AudioCaptionForm({ onAudioUrlSubmit }: AudioCaptionFormProps) {
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate the URL
      new URL(audioUrl);
      onAudioUrlSubmit(audioUrl);
    } catch (err) {
      setError('Please enter a valid URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="audioUrl" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
          >
            Audio URL
          </label>
          <input
            type="url"
            id="audioUrl"
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="Enter audio URL"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Processing...' : 'Generate Video'}
        </button>
      </form>

      {error && (
        <div className="p-4 text-red-700 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}
    </div>
  );
} 