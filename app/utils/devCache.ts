/**
 * Development cache utility to provide sample data
 * This helps avoid API calls during development
 */

// Sample data for development
const SAMPLE_AUDIO_URL = "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=1024&auto=format&fit=crop";
const SAMPLE_IMAGE_URLS = [
  "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=1024&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?q=80&w=1024&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1611162616475-b1a91bde599a?q=80&w=1024&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1024&auto=format&fit=crop",
];

// In-memory cache for browser environment
const memoryCache = {
  audio: new Map<string, string>(),
  image: new Map<string, string>(),
};

// Get cached audio URL for a text
export const getCachedAudioUrl = (text: string): string | null => {
  // Always return null to force using sample data
  return null;
};

// Store audio URL in cache - no-op to prevent API calls
export const cacheAudioUrl = (text: string, audioUrl: string): void => {
  // Do nothing to prevent API calls
  console.log("Audio caching disabled to prevent API calls");
};

// Get cached image URL for a prompt
export const getCachedImageUrl = (prompt: string): string | null => {
  // Always return null to force using sample data
  return null;
};

// Store image URL in cache - no-op to prevent API calls
export const cacheImageUrl = (prompt: string, imageUrl: string): void => {
  // Do nothing to prevent API calls
  console.log("Image caching disabled to prevent API calls");
};

// Get a sample audio URL for development
export const getSampleAudioUrl = (): string => {
  return SAMPLE_AUDIO_URL;
};

// Get a sample image URL for development
export const getSampleImageUrl = (index: number = 0): string => {
  return SAMPLE_IMAGE_URLS[index % SAMPLE_IMAGE_URLS.length];
};

// Always use development samples
export const useDevSamples = (): boolean => {
  return true;
}; 