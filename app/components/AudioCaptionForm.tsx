'use client';

import { useState } from 'react';

export default function AudioCaptionForm() {
  const [audioUrl, setAudioUrl] = useState('');
  const [captions, setCaptions] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCaptions('');

    try {
      const response = await fetch('/api/tik-tok-video-gen/getcaptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch captions');
      }

      const data = await response.json();
      setCaptions(data.captions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
          {loading ? 'Getting Captions...' : 'Get Captions'}
        </button>
      </form>

      {error && (
        <div className="p-4 text-red-700 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      {/* {captions && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2 dark:text-gray-200">Captions:</h3>
          <div className="p-4 bg-gray-100 rounded-md dark:bg-gray-800 dark:text-gray-200">
            {captions}
          </div>
        </div>
      )} */}
    </div>
  );
} 