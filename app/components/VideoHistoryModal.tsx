'use client';

import { useState, useEffect } from 'react';
import { X, Play, Download } from 'lucide-react';

interface Video {
  _id: string;
  title: string;
  script: string;
  audioUrl: string;
  images: Array<{
    contextText: string;
    imageUrl: string;
  }>;
  createdAt: string;
  url?: string;
}

interface VideoHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoHistoryModal({ isOpen, onClose }: VideoHistoryModalProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVideos();
    }
  }, [isOpen]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tik-tok-video-gen/videos');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched videos:', data); // For debugging
      
      // Ensure each video has required fields
      const processedVideos = data.map((video: any) => ({
        ...video,
        title: video.title || 'Untitled',
        script: video.script || 'No script available',
        images: Array.isArray(video.images) ? video.images : [],
        createdAt: video.createdAt || new Date().toISOString()
      }));
      
      setVideos(processedVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError('Failed to load videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getVideoStatus = (video: Video) => {
    if (video.url) {
      return 'completed';
    }
    if (video.audioUrl) {
      return 'processing';
    }
    return 'pending';
  };

  const getStatusColor = (video: Video) => {
    const status = getVideoStatus(video);
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-6xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="w-full">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Videos History
              </h3>
              
              <div className="mt-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-blue-600"></div>
                  </div>
                ) : error ? (
                  <p className="py-8 text-center text-red-500">{error}</p>
                ) : videos.length === 0 ? (
                  <p className="py-8 text-center text-gray-500">No videos found</p>
                ) : (
                  <div className="mt-2">
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Title/Script
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Created At
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Images
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {videos.map((video) => (
                            <tr key={video._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {video.title}
                                </div>
                                <div className="mt-1 text-sm text-gray-500 line-clamp-2">
                                  {video.script}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                {new Date(video.createdAt).toLocaleDateString()} {new Date(video.createdAt).toLocaleTimeString()}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm">
                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(video)}`}>
                                  {getVideoStatus(video)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex space-x-2">
                                  {video.images.slice(0, 3).map((image, index) => (
                                    <img
                                      key={index}
                                      src={image.imageUrl}
                                      alt={image.contextText}
                                      className="h-12 w-12 rounded object-cover"
                                      title={image.contextText}
                                    />
                                  ))}
                                  {video.images.length > 3 && (
                                    <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-sm text-gray-500">
                                      +{video.images.length - 3}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm">
                                <div className="flex space-x-3">
                                  {video.audioUrl && (
                                    <a
                                      href={video.audioUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800"
                                      title="Play Audio"
                                    >
                                      <Play className="h-5 w-5" />
                                    </a>
                                  )}
                                  {video.url && (
                                    <a
                                      href={video.url}
                                      download
                                      className="text-blue-600 hover:text-blue-800"
                                      title="Download Video"
                                    >
                                      <Download className="h-5 w-5" />
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 