import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState, useRef } from "react";
import { ITikTokVideo } from "@/models/tiktokVideoModel/tiktokvideomodel";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

interface VideoHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoHistoryModal({ isOpen, onClose }: VideoHistoryModalProps) {
  const [videos, setVideos] = useState<ITikTokVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null);
  const [pollingVideos, setPollingVideos] = useState<Record<string, { renderId: string, interval: NodeJS.Timeout | null }>>({}); 
  const [autoCheckingStatus, setAutoCheckingStatus] = useState(false);
  
  // Use a ref to track mounted state to avoid memory leaks
  const isMounted = useRef(true);
  
  useEffect(() => {
    return () => {
      // Set mounted state to false when component unmounts
      isMounted.current = false;
      
      // Clear all polling intervals
      Object.values(pollingVideos).forEach(({ interval }) => {
        if (interval) clearInterval(interval);
      });
    };
  }, [pollingVideos]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/tik-tok-video-gen/videos');
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }
        const data = await response.json();
        
        // Log the received data for debugging
        console.log('Fetched videos data:', data.map((v: ITikTokVideo) => ({ 
          id: v._id, 
          status: v.status,
          url: v.url ? 'has url' : 'no url',
          renderId: v.renderId ? 'has renderId' : 'no renderId'
        })));
        
        setVideos(data);
        
        // Check for videos in 'generating' status and start polling for them
        data.forEach((video: ITikTokVideo) => {
          if ((video.status as string) === 'generating' && video.renderId) {
            startPolling(String(video._id), video.renderId);
          }
        });

        // Automatically check all generating videos when modal opens
        const generatingVideos = data.filter((video: ITikTokVideo) => 
          (video.status as string) === 'generating' && video.renderId
        );
        
        if (generatingVideos.length > 0) {
          console.log(`Auto-checking status of ${generatingVideos.length} generating videos...`);
          setAutoCheckingStatus(true);
          
          // Use Promise.all to wait for all status checks to complete
          await Promise.all(
            generatingVideos.map(async (video: ITikTokVideo) => {
              if (video._id && video.renderId) {
                await handleCheckStatus(String(video._id), video.renderId);
              }
            })
          );
          
          setAutoCheckingStatus(false);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching videos:', err);
        setAutoCheckingStatus(false);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchVideos();
    }
  }, [isOpen]);

  const startPolling = (videoId: string, renderId: string) => {
    // If already polling this video, don't start another interval
    if (pollingVideos[videoId]) {
      console.log(`Already polling video ${videoId}, skipping`);
      return;
    }
    
    console.log(`Starting polling for video ${videoId} with render ID ${renderId}`);
    
    // Create polling interval
    const interval = setInterval(async () => {
      if (!isMounted.current) {
        console.log(`Component unmounted, stopping polling for video ${videoId}`);
        clearInterval(interval);
        return;
      }
      
      try {
        console.log(`Polling for video ${videoId} status...`);
        const response = await fetch('/api/tik-tok-video-gen/check-render-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, renderId })
        });
        
        if (!response.ok) {
          throw new Error('Failed to check render status');
        }
        
        const result = await response.json();
        console.log(`Polling result for video ${videoId}:`, result);
        
        // Log specifically if videoUrl is present
        if (result.videoUrl) {
          console.log(`Video URL found for ${videoId}:`, result.videoUrl);
        } else {
          console.log(`No video URL found for ${videoId} in this response`);
        }
        
        // If the video is completed or failed, stop polling
        if (result.status === 'completed' || result.status === 'failed' || 
            result.appStatus === 'completed' || result.appStatus === 'failed') {
          
          const finalStatus = result.appStatus || result.status;
          console.log(`Video ${videoId} is now ${finalStatus}, updating state and stopping polling`);
          
          // Update the video in the state
          setVideos(prevVideos => {
            const updatedVideos = prevVideos.map(video => {
              if (String(video._id) === videoId) {
                const updatedVideo = { 
                  ...video, 
                  status: finalStatus as 'completed' | 'failed' | 'generating' | 'pending', 
                  url: result.videoUrl || video.url 
                } as unknown as ITikTokVideo;
                
                console.log(`Updated video ${videoId} state:`, {
                  oldStatus: video.status,
                  newStatus: updatedVideo.status,
                  oldUrl: video.url,
                  newUrl: updatedVideo.url || 'no url'
                });
                
                return updatedVideo;
              }
              return video;
            });
            
            return updatedVideos;
          });
          
          // Show toast notification
          if (finalStatus === 'completed') {
            toast.success('Video generation completed successfully!');
          } else {
            toast.error('Video generation failed');
          }
          
          // Stop polling
          console.log(`Stopping polling for video ${videoId}`);
          clearInterval(interval);
          setPollingVideos(prev => {
            const newPolling = { ...prev };
            delete newPolling[videoId];
            return newPolling;
          });
        } else {
          console.log(`Video ${videoId} is still ${result.status || result.appStatus}, continuing polling`);
          
          // Update the status even if still generating
          if (result.appStatus) {
            setVideos(prevVideos => {
              return prevVideos.map(video => 
                String(video._id) === videoId 
                  ? { 
                      ...video, 
                      status: result.appStatus as 'completed' | 'failed' | 'generating' | 'pending'
                    } as unknown as ITikTokVideo
                  : video
              );
            });
          }
        }
      } catch (err) {
        console.error(`Error polling render status for video ${videoId}:`, err);
        // Don't stop polling on error, just log it
      }
    }, 2000); // Poll every 2 seconds for faster updates
    
    // Store the interval ID
    setPollingVideos(prev => {
      const newPolling = { ...prev, [videoId]: { renderId, interval } };
      console.log(`Added polling for video ${videoId}, current polling videos:`, Object.keys(newPolling));
      return newPolling;
    });
  };

  const handleGenerateVideo = async (videoId: string) => {
    try {
      setGeneratingVideoId(videoId);
      const response = await fetch('/api/tik-tok-video-gen/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate video');
      }

      const result = await response.json();
      
      // If the video already exists, show a different message
      if (result.alreadyExists) {
        toast.success('Video already exists, you can download it');
        
        // Update the video status in the local state
        setVideos(prevVideos => 
          prevVideos.map(video => 
            String(video._id) === videoId 
              ? { ...video, status: 'completed' as const, url: result.videoUrl } as unknown as ITikTokVideo
              : video
          )
        );
      } else {
        toast.success('Video generation started successfully');
        
        // Update the video status in the local state
        setVideos(prevVideos => 
          prevVideos.map(video => 
            String(video._id) === videoId 
              ? { ...video, status: 'generating' as const, renderId: result.renderId } as unknown as ITikTokVideo
              : video
          )
        );
        
        // Start polling for status updates
        if (result.renderId) {
          startPolling(videoId, result.renderId);
        }
      }

    } catch (err) {
      console.error('Error generating video:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate video');
    } finally {
      setGeneratingVideoId(null);
    }
  };

  const handleDownloadVideo = (url: string, videoId: string) => {
    // Create a temporary anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiktok-video-${videoId}.mp4`;
    a.target = '_blank'; // Ensure it opens in a new tab if download attribute is not supported
    document.body.appendChild(a);
    
    // Log the download attempt
    console.log(`Attempting to download video from URL: ${url}`);
    
    // Click the anchor to trigger the download
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  };

  const getStatusBadge = (status?: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status as string) {
      case 'completed':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Completed</span>;
      case 'generating':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Generating</span>;
      case 'failed':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Failed</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Pending</span>;
    }
  };

  const handleCheckStatus = async (videoId: string, renderId?: string) => {
    if (!renderId) {
      toast.error('No render ID available for this video');
      return;
    }
    
    try {
      console.log(`Manually checking status for video ${videoId} with render ID ${renderId}`);
      setAutoCheckingStatus(true);
      
      const response = await fetch('/api/tik-tok-video-gen/check-render-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, renderId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to check render status');
      }
      
      const result = await response.json();
      console.log(`Manual status check result for video ${videoId}:`, result);
      
      // Log specifically if videoUrl is present
      if (result.videoUrl) {
        console.log(`Video URL found for ${videoId} in manual check:`, result.videoUrl);
      } else {
        console.log(`No video URL found for ${videoId} in manual check response`);
      }
      
      const finalStatus = result.appStatus || result.status;
      
      // Update the video in the state regardless of status
      setVideos(prevVideos => {
        const updatedVideos = prevVideos.map(video => {
          if (String(video._id) === videoId) {
            const updatedVideo = { 
              ...video, 
              status: finalStatus, 
              url: result.videoUrl || video.url 
            } as unknown as ITikTokVideo;
            
            console.log(`Manual check updated video ${videoId} state:`, {
              oldStatus: video.status,
              newStatus: updatedVideo.status,
              oldUrl: video.url,
              newUrl: updatedVideo.url
            });
            
            return updatedVideo;
          }
          return video;
        });
        
        return updatedVideos;
      });
      
      // Show toast notification
      if (finalStatus === 'completed') {
        toast.success('Video is ready!');
        
        // Stop polling if it was active
        if (pollingVideos[videoId] && pollingVideos[videoId].interval) {
          clearInterval(pollingVideos[videoId].interval);
          setPollingVideos(prev => {
            const newPolling = { ...prev };
            delete newPolling[videoId];
            return newPolling;
          });
        }
      } else if (finalStatus === 'failed') {
        toast.error('Video generation failed');
        
        // Stop polling if it was active
        if (pollingVideos[videoId] && pollingVideos[videoId].interval) {
          clearInterval(pollingVideos[videoId].interval);
          setPollingVideos(prev => {
            const newPolling = { ...prev };
            delete newPolling[videoId];
            return newPolling;
          });
        }
      } else {
        toast('Video is still ' + finalStatus);
        
        // Start polling if not already polling
        if (!pollingVideos[videoId]) {
          startPolling(videoId, renderId);
        }
      }
    } catch (err) {
      console.error(`Error manually checking status for video ${videoId}:`, err);
      toast.error('Failed to check video status');
    } finally {
      setAutoCheckingStatus(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tik-tok-video-gen/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      // Remove the video from the local state
      setVideos(prevVideos => prevVideos.filter(video => String(video._id) !== videoId));
      toast.success('Video deleted successfully');

    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Video History</DialogTitle>
        </DialogHeader>
        
        {autoCheckingStatus && (
          <div className="mb-4 flex items-center justify-center text-sm text-blue-600">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Automatically checking video status...
          </div>
        )}
        
        {Object.keys(pollingVideos).length > 0 && (
          <div className="mb-4 flex items-center justify-center text-sm text-green-600">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating {Object.keys(pollingVideos).length} video(s)... This may take a few minutes.
          </div>
        )}
        
        <ScrollArea className="h-[70vh] w-full pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center p-4">
              {error}
            </div>
          ) : videos.length === 0 ? (
            <div className="text-gray-500 text-center p-4">
              No videos found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
              {videos.map((video, index) => (
                <div
                  key={String(video._id)}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col"
                >
                  <div className="p-4 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg line-clamp-2 flex-1 mr-2">
                        {video.script}
                      </h3>
                      {getStatusBadge(video.status)}
                    </div>
                    
                    {!video.url && video.images && video.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {video.images.slice(0, 4).map((image, imgIndex) => (
                          <div key={imgIndex} className="aspect-square relative overflow-hidden rounded-md">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={image.imageUrl}
                              alt={image.contextText}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-sm text-gray-500 mb-3">
                      Created: {new Date(video.createdAt).toLocaleDateString()}
                    </div>

                    {video.audioUrl && !video.url && (
                      <audio controls className="w-full mb-3">
                        <source src={video.audioUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    )}

                    {video.url ? (
                      <>
                        <div className="aspect-[9/16] w-full rounded-md overflow-hidden bg-black mx-auto">
                          <video 
                            src={video.url} 
                            controls 
                            className="w-full h-full object-contain"
                            poster={video.images?.[0]?.imageUrl}
                            playsInline
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                        <div className="mt-3 flex items-center space-x-2">
                          <button
                            onClick={() => video.url && handleDownloadVideo(video.url, String(video._id))}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Download Video
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(String(video._id))}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete video"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </>
                    ) : (video.status as string) === 'generating' ? (
                      <div className="flex gap-2">
                        <button
                          disabled
                          className="inline-flex items-center justify-center flex-1 px-4 py-2 text-sm font-medium rounded-md bg-gray-300 cursor-not-allowed"
                        >
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating Video...
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(String(video._id))}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete video"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGenerateVideo(String(video._id))}
                          disabled={generatingVideoId === String(video._id)}
                          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {generatingVideoId === String(video._id) ? 'Generating...' : 'Generate Video'}
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(String(video._id))}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete video"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
