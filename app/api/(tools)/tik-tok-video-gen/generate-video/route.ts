import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/app/lib/db";
import TikTokVideo from "@/models/tiktokVideoModel/tiktokvideomodel";
import { Client } from 'creatomate';

// Create Scene 1: Introduction with first image
const createScene1 = (image: {imageUrl: string, contextText: string}, duration: number, imageCount: number) => {
  return {
    type: 'composition',
    track: 1,
    duration_percentage: 1 / imageCount, // Each scene takes an equal percentage of the total duration
    elements: [
      // Background image with subtle zoom effect
      {
        type: 'image',
        source: image.imageUrl,
        width: '100%',
        height: '100%',
        fit: 'cover',
        // No animations to keep image size consistent
      },
      // Add caption with the image's contextText
      {
        type: 'text',
        text: image.contextText,
        y: '85%', // Position at bottom
        width: '90%',
        x: '50%',
        background_color: 'rgba(0, 0, 0, 0.5)',
        background_border_radius: 10,
        padding: 15,
        text_align: 'center',
        color: '#FFFFFF',
        font_family: 'Roboto',
        font_weight: 'bold',
        font_size: '40px'
      }
    ],
  };
};

// Create Scene 2: Middle content with second image
const createScene2 = (image: {imageUrl: string, contextText: string}, duration: number, imageCount: number) => {
  return {
    type: 'composition',
    track: 1,
    duration_percentage: 1 / imageCount, // Each scene takes an equal percentage of the total duration
    elements: [
      // Background image with no animation
      {
        type: 'image',
        source: image.imageUrl,
        width: '100%',
        height: '100%',
        fit: 'cover',
        // No animations to keep image size consistent
      },
      // Add caption with the image's contextText
      {
        type: 'text',
        text: image.contextText,
        y: '85%', // Position at bottom
        width: '90%',
        x: '50%',
        background_color: 'rgba(0, 0, 0, 0.5)',
        background_border_radius: 10,
        padding: 15,
        text_align: 'center',
        color: '#FFFFFF',
        font_family: 'Roboto',
        font_weight: 'bold',
        font_size: '40px'
      }
    ],
  };
};

// Create Scene 3: Content continuation with third image
const createScene3 = (image: {imageUrl: string, contextText: string}, duration: number, imageCount: number) => {
  return {
    type: 'composition',
    track: 1,
    duration_percentage: 1 / imageCount, // Each scene takes an equal percentage of the total duration
    elements: [
      // Background image with no animation
      {
        type: 'image',
        source: image.imageUrl,
        width: '100%',
        height: '100%',
        fit: 'cover',
        // No animations to keep image size consistent
      },
      // Add caption with the image's contextText
      {
        type: 'text',
        text: image.contextText,
        y: '85%', // Position at bottom
        width: '90%',
        x: '50%',
        background_color: 'rgba(0, 0, 0, 0.5)',
        background_border_radius: 10,
        padding: 15,
        text_align: 'center',
        color: '#FFFFFF',
        font_family: 'Roboto',
        font_weight: 'bold',
        font_size: '40px'
      }
    ],
  };
};

// Create Scene 4: Conclusion with fourth image
const createScene4 = (image: {imageUrl: string, contextText: string}, duration: number, imageCount: number) => {
  return {
    type: 'composition',
    track: 1,
    duration_percentage: 1 / imageCount, // Each scene takes an equal percentage of the total duration
    elements: [
      // Background image with no animation
      {
        type: 'image',
        source: image.imageUrl,
        width: '100%',
        height: '100%',
        fit: 'cover',
        // No animations to keep image size consistent
      },
      // Add caption with the image's contextText
      {
        type: 'text',
        text: image.contextText,
        y: '85%', // Position at bottom
        width: '90%',
        x: '50%',
        background_color: 'rgba(0, 0, 0, 0.5)',
        background_border_radius: 10,
        padding: 15,
        text_align: 'center',
        color: '#FFFFFF',
        font_family: 'Roboto',
        font_weight: 'bold',
        font_size: '40px'
      }
    ],
  };
};

// This function creates the video composition structure with scenes
const createVideoComposition = (images: Array<{imageUrl: string, contextText: string}>, captions: Array<{text: string, start: number, end: number}>, audioUrl: string) => {
  // We need to determine the audio duration, but since we don't have direct access to it here,
  // we'll use a different approach for calculating total duration
  
  // If we have captions, use the last caption's end time
  // Otherwise, we'll set a default that will be overridden when rendering
  let totalDuration = captions.length > 0 ? captions[captions.length - 1].end : 30;
  
  // Note: The actual audio duration will be determined during rendering
  // and the video duration will be adjusted to match it
  
  // Safety check: ensure duration is reasonable (max 10 minutes)
  if (totalDuration <= 0 || totalDuration > 600) {
    console.warn(`Invalid duration detected: ${totalDuration}s. Setting to default 30s.`);
    totalDuration = 30; // Default to 30 seconds if duration is invalid
  }
  
  console.log(`Initial video duration set to: ${totalDuration} seconds (will be adjusted to match audio)`);
  
  // Ensure we have at least one image
  if (images.length === 0) {
    console.warn('No images provided for video composition');
    throw new Error('At least one image is required for video composition');
  }
  
  // Calculate how many images to use (use all available images)
  const imageCount = images.length;
  
  // Calculate how long each image should be shown
  // We divide the total duration by the number of images to get equal segments
  const segmentDuration = totalDuration / imageCount;
  
  console.log(`Using ${imageCount} images, each shown for approximately ${segmentDuration.toFixed(2)} seconds`);
  
  // Create a timeline of image segments
  const imageSegments = images.map((image, index) => {
    // For auto duration, we'll use relative positioning (percentages)
    // Each image gets an equal portion of the total duration
    const percentage = 1 / imageCount;
    const startPercentage = index * percentage;
    const endPercentage = (index + 1) * percentage;
    
    // We'll still calculate approximate durations for logging purposes
    const startTime = index * segmentDuration;
    const endTime = (index + 1) * segmentDuration;
    
    console.log(`Image ${index + 1}: Approximate time ${startTime.toFixed(2)}s to ${endTime.toFixed(2)}s (${(percentage * 100).toFixed(1)}% of total)`);
    
    return {
      image,
      startPercentage,
      endPercentage,
      // For fixed positioning, we'll keep these values
      startTime,
      endTime,
      duration: endTime - startTime
    };
  });
  
  // Create scenes based on image segments
  const scenes = imageSegments.map((segment, index) => {
    // Choose different animation styles based on position in sequence
    let sceneCreator;
    switch (index % 4) {
      case 0: sceneCreator = createScene1; break;
      case 1: sceneCreator = createScene2; break;
      case 2: sceneCreator = createScene3; break;
      case 3: sceneCreator = createScene4; break;
      default: sceneCreator = createScene1;
    }
    
    console.log(`Creating scene ${index + 1} for image "${segment.image.contextText.substring(0, 20)}..."`);
    
    // Create the scene with proper timing
    const scene = sceneCreator(segment.image, segment.duration, imageCount);
    
    // Add time offset to position the scene in the timeline
    // When using auto duration, we'll use time_percentage instead of absolute time
    return {
      ...scene,
      time_percentage: segment.startPercentage
    };
  });
  
  console.log(`Created ${scenes.length} scenes for ${images.length} images`);
  
  if (scenes.length !== images.length) {
    console.warn(`WARNING: Number of scenes (${scenes.length}) does not match number of images (${images.length})`);
  }
  
  // Log the first scene to check its structure
  if (scenes.length > 0) {
    console.log('First scene structure:', JSON.stringify(scenes[0], null, 2));
  }
  
  const finalComposition = {
    output_format: 'mp4',
    width: 1080,  // TikTok portrait format
    height: 1920,
    frame_rate: 30,
    snapshot_time: totalDuration / 2, // Take snapshot in the middle
    duration: 'auto', // Set to 'auto' to match audio duration
    elements: [
      // Add the audio track first
      {
        type: 'audio',
        source: audioUrl,
        duration: 'auto', // Let the audio determine the video duration
        audio_fade_out: 0.5, // Shorter fade out
      },
      
      // Add all scenes
      ...scenes
    ]
  };
  
  // Count the number of scenes in the final composition
  const sceneCount = finalComposition.elements.filter(el => 
    typeof el === 'object' && el !== null && 'type' in el && el.type === 'composition'
  ).length;
  
  console.log(`Final composition has ${finalComposition.elements.length} elements, including ${sceneCount} scenes`);
  
  return finalComposition;
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { videoId } = await request.json();

    // Find the video in the database
    const video = await TikTokVideo.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Check if the video already has a URL and is completed
    if (video.url && video.status === 'completed') {
      console.log(`Video already has a URL: ${video.url}. Returning existing URL.`);
      return NextResponse.json({
        success: true,
        message: "Video already exists",
        videoId: video._id,
        videoUrl: video.url,
        alreadyExists: true
      });
    }

    // Validate required data
    if (!video.audioUrl) {
      return NextResponse.json({ error: "Audio URL is missing" }, { status: 400 });
    }

    if (!video.images || video.images.length === 0) {
      return NextResponse.json({ error: "No images available for video generation" }, { status: 400 });
    }

    console.log(`Starting video generation for videoId: ${videoId}`);
    console.log(`Audio URL: ${video.audioUrl}`);
    console.log(`Number of images: ${video.images.length}`);
    console.log(`Number of captions: ${video.captions ? video.captions.length : 0} (captions will be ignored)`);
    console.log(`Image captions will be displayed using each image's contextText`);

    // Update video status to generating
    video.status = 'generating';
    await video.save();

    try {
      // Create the video composition with scenes
      const composition = createVideoComposition(
        video.images,
        video.captions || [],
        video.audioUrl
      );

      // Get the API key from environment variables
      const apiKey = process.env.CREATOMATE_API_KEY;
      
      // Check if API key exists
      if (!apiKey) {
        throw new Error('Creatomate API key is not configured');
      }

      console.log('API Key found, length:', apiKey.length);
      console.log('Composition structure:', JSON.stringify({
        output_format: composition.output_format,
        width: composition.width,
        height: composition.height,
        duration: composition.duration,
        frame_rate: composition.frame_rate,
        element_count: composition.elements.length,
        scene_count: composition.elements.filter(el => 
          typeof el === 'object' && el !== null && 'type' in el && el.type === 'composition'
        ).length,
        image_count: video.images.length
      }, null, 2));

      // Initialize the Creatomate client with your API key
      const client = new Client(apiKey);
      
      console.log('Creatomate client initialized, sending video composition for rendering...');
      
      // Render the video using Creatomate
      try {
        // First, validate the composition
        if (typeof composition.duration === 'number') {
          if (composition.duration <= 0) {
            throw new Error(`Invalid composition duration: ${composition.duration}`);
          }
        } else if (composition.duration !== 'auto') {
          throw new Error(`Invalid composition duration type: ${typeof composition.duration}`);
        }
        
        if (composition.elements.length === 0) {
          throw new Error('Composition has no elements');
        }
        
        // Check audio source
        const audioElement = composition.elements.find(el => 
          typeof el === 'object' && el !== null && 'type' in el && el.type === 'audio'
        ) as { type: string; source?: string; duration?: string | number } | undefined;
        
        if (!audioElement) {
          console.warn('No audio element found in composition');
        } else if (!audioElement.source) {
          throw new Error('Audio element has no source');
        } else {
          // Validate audio URL format
          try {
            new URL(audioElement.source);
            console.log('Audio URL is valid');
            console.log('Audio duration setting:', audioElement.duration);
          } catch (urlError) {
            throw new Error(`Invalid audio URL format: ${audioElement.source}`);
          }
        }
        
        // Check image sources
        const imageElements = composition.elements.filter(el => 
          typeof el === 'object' && el !== null && 'type' in el && el.type === 'image'
        );
        if (imageElements.length === 0) {
          console.warn('No image elements found in composition');
        } else {
          console.log(`Found ${imageElements.length} image elements in composition`);
        }
        
        console.log(`Sending composition with ${composition.elements.length} elements, duration: ${composition.duration === 'auto' ? 'auto (based on audio)' : composition.duration}s`);
        
        // Create a simplified composition object to avoid any potential issues
        const renderSource = {
          outputFormat: 'mp4',
          width: composition.width,
          height: composition.height,
          duration: 'auto', // Use auto to match audio duration
          frameRate: 30,
          elements: composition.elements.map(element => {
            // Ensure all elements have proper timing
            if (element.type === 'audio') {
              return {
                ...element,
                duration: 'auto', // Let audio determine the video duration
              };
            }
            return element;
          })
        };
        
        // Count the number of scenes in the render source
        const renderSceneCount = renderSource.elements.filter(el => 
          typeof el === 'object' && el !== null && 'type' in el && el.type === 'composition'
        ).length;
        
        console.log(`Render source has ${renderSource.elements.length} elements, including ${renderSceneCount} scenes`);
        
        // Render with specific options to ensure proper timing
        console.log('Sending render request to Creatomate...');
        const renders = await client.render({
          source: renderSource,
          outputFormat: 'mp4',
          frameRate: 30
        });
        
        // Get the render ID for polling
        const render = renders[0];
        console.log('Render initiated:', JSON.stringify({
          id: render.id,
          status: render.status
        }, null, 2));
        
        // Store the render ID in the video document for future reference
        video.renderId = render.id;
        await video.save();
        
        // Return the render ID for polling
        return NextResponse.json({
          success: true,
          message: "Video generation started, please poll for status",
          videoId: video._id,
          renderId: render.id,
          status: 'generating'
        });
      } catch (renderError) {
        console.error('Creatomate render error details:', renderError);
        
        // Try to extract more detailed error information
        let errorMessage = 'Unknown rendering error';
        if (renderError instanceof Error) {
          errorMessage = renderError.message;
          console.error('Error stack:', renderError.stack);
        } else {
          errorMessage = String(renderError);
        }
        
        // Update video status with error message
        video.status = 'failed';
        await video.save();
        console.log(`Video status updated to 'failed' in database`);
        
        throw new Error(`Creatomate rendering failed: ${errorMessage}`);
      }

    } catch (error) {
      console.error('Error in video rendering:', error);
      // Update video status to failed if generation fails
      video.status = 'failed';
      await video.save();
      throw error;
    }

  } catch (error) {
    console.error('Error generating video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video' },
      { status: 500 }
    );
  }
} 