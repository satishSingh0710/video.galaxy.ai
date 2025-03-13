import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Interface for upload response from Cloudinary
 */
export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  duration?: number;
  url: string;
  original_filename: string;
}

/**
 * Interface for upload options
 */
export interface UploadOptions {
  folder?: string;
  resource_type?: 'auto' | 'image' | 'video' | 'raw';
  use_filename?: boolean;
  unique_filename?: boolean;
  overwrite?: boolean;
  tags?: string[];
  transformation?: any;
}

/**
 * Uploads an audio file to Cloudinary
 * @param filePath - Path to the audio file (can be a local path or a URL)
 * @param options - Upload options
 * @returns Promise with upload response
 */
export const uploadAudio = async (
  filePath: string,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResponse> => {
  try {
    // Set default options for audio uploads
    const defaultOptions: UploadOptions = {
      resource_type: 'auto', // Automatically detect resource type
      folder: 'audio-uploads',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };

    // Merge default options with provided options
    const uploadOptions = { ...defaultOptions, ...options };

    // Upload the file to Cloudinary
    const result = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath,
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result as CloudinaryUploadResponse);
        }
      );
    });

    return result;
  } catch (error) {
    console.error('Error uploading audio to Cloudinary:', error);
    throw error;
  }
};

/**
 * Uploads an audio file from a buffer to Cloudinary
 * @param buffer - Buffer containing the audio data
 * @param options - Upload options
 * @returns Promise with upload response
 */
export const uploadAudioBuffer = async (
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResponse> => {
  try {
    // Set default options for audio uploads
    const defaultOptions: UploadOptions = {
      resource_type: 'auto',
      folder: 'audio-uploads',
      unique_filename: true,
      overwrite: false,
    };

    // Merge default options with provided options
    const uploadOptions = { ...defaultOptions, ...options };

    // Convert buffer to base64 data URI
    const base64Data = buffer.toString('base64');
    const dataUri = `data:audio/mp3;base64,${base64Data}`;

    // Upload the buffer to Cloudinary
    const result = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUri,
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result as CloudinaryUploadResponse);
        }
      );
    });

    return result;
  } catch (error) {
    console.error('Error uploading audio buffer to Cloudinary:', error);
    throw error;
  }
};

/**
 * Deletes a file from Cloudinary
 * @param publicId - Public ID of the file to delete
 * @param resourceType - Type of resource ('image', 'video', 'raw', etc.)
 * @returns Promise with deletion result
 */
export const deleteFile = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'video'
): Promise<{ result: string }> => {
  try {
    return await new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: resourceType },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result as { result: string });
        }
      );
    });
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

/**
 * Uploads a file to Cloudinary
 * @param filePath - Path to the file (can be a local path or a URL)
 * @param options - Upload options
 * @returns Promise with upload response
 */
export const uploadFile = async (
  filePath: string,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResponse> => {
  try {
    // Set default options for file uploads
    const defaultOptions: UploadOptions = {
      resource_type: 'auto', // Automatically detect resource type
      folder: 'uploads',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };

    // Merge default options with provided options
    const uploadOptions = { ...defaultOptions, ...options };

    // Upload the file to Cloudinary
    const result = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath,
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result as CloudinaryUploadResponse);
        }
      );
    });

    return result;
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    throw error;
  }
};

/**
 * Verifies that Cloudinary is properly configured
 * @returns Promise that resolves to true if configured, or rejects with error
 */
export const verifyCloudinaryConfig = async (): Promise<boolean> => {
  try {
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary environment variables are not properly configured');
    }
    
    // Test the configuration with a simple ping
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.api.ping((error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
    
    return true;
  } catch (error) {
    console.error('Cloudinary configuration error:', error);
    throw error;
  }
};

/**
 * Uploads a video file to Cloudinary
 * @param filePath - Path to the video file (can be a local path or a URL)
 * @param resourceType - Resource type (default: 'video')
 * @param options - Upload options
 * @returns Promise with upload response
 */
export const uploadToCloudinary = async (
  filePath: string,
  resourceType: 'image' | 'video' | 'raw' = 'video',
  options: UploadOptions = {}
): Promise<string> => {
  try {
    // Set default options for video uploads
    const defaultOptions: UploadOptions = {
      folder: 'tiktok-videos',
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: true,
    };

    // Merge default options with provided options
    const mergedOptions = { ...defaultOptions, ...options };

    // Upload the file to Cloudinary
    const result = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {
      cloudinary.uploader.upload(filePath, mergedOptions, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result as CloudinaryUploadResponse);
        }
      });
    });

    // Return the secure URL of the uploaded file
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error);
    throw error;
  }
};
