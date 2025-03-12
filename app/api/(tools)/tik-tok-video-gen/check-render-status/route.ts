import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/app/lib/db";
import TikTokVideo from "@/models/tiktokVideoModel/tiktokvideomodel";
import { Client } from 'creatomate';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { videoId, renderId } = await request.json();
    console.log(`Checking render status for videoId: ${videoId}, renderId: ${renderId}`);

    if (!videoId || !renderId) {
      console.error('Missing required parameters');
      return NextResponse.json({ error: "Video ID and Render ID are required" }, { status: 400 });
    }

    // Find the video in the database
    const video = await TikTokVideo.findById(videoId);
    if (!video) {
      console.error(`Video not found with ID: ${videoId}`);
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    console.log(`Found video with status: ${video.status}, url: ${video.url || 'none'}`);

    // If the video already has a URL and status is completed, return it
    if (video.url && video.status === 'completed') {
      console.log(`Video ${videoId} is already completed with URL: ${video.url}`);
      return NextResponse.json({
        success: true,
        status: 'completed',
        videoId: video._id,
        videoUrl: video.url
      });
    }

    // Get the API key from environment variables
    const apiKey = process.env.CREATOMATE_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
      throw new Error('Creatomate API key is not configured');
    }

    // Initialize the Creatomate client with your API key
    const client = new Client(apiKey);
    
    // Check the render status
    console.log(`Fetching render status from Creatomate for ID: ${renderId}`);
    
    // Use fetch to directly call the Creatomate API since client.getRender doesn't exist
    const response = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch render status: ${response.statusText}`);
    }
    
    const render = await response.json();
    
    console.log(`Checking render status for ID ${renderId}:`, JSON.stringify({
      id: render.id,
      status: render.status,
      url: render.url || 'not available yet'
    }, null, 2));

    // If the render is completed and has a URL
    // Note: Creatomate API returns "succeeded" instead of "completed"
    if ((render.status === 'completed' || render.status === 'succeeded') && render.url) {
      console.log(`Render ${renderId} is completed with URL: ${render.url}`);
      
      // Update the video with the URL
      video.url = render.url;
      video.status = 'completed';
      await video.save();
      
      console.log(`Video status updated to 'completed' in database with URL: ${render.url}`);
      
      return NextResponse.json({
        success: true,
        status: 'completed',
        videoId: video._id,
        videoUrl: render.url,
        duration: render.duration || 'unknown'
      });
    } 
    // If the render failed
    else if (render.status === 'failed') {
      console.log(`Render ${renderId} has failed`);
      
      // Update the video status
      video.status = 'failed';
      await video.save();
      
      console.log(`Video status updated to 'failed' in database`);
      
      return NextResponse.json({
        success: false,
        status: 'failed',
        videoId: video._id,
        error: render.error || 'Video generation failed'
      });
    }
    // If the render is still in progress
    else {
      console.log(`Render ${renderId} is still in progress with status: ${render.status}`);
      
      // Map Creatomate status to our application status
      let appStatus = 'generating';
      
      // If the status is something unexpected, log it for debugging
      if (render.status !== 'processing' && render.status !== 'queued') {
        console.log(`Unexpected render status: ${render.status}. Full response:`, JSON.stringify(render, null, 2));
      }
      
      return NextResponse.json({
        success: true,
        status: appStatus,
        videoId: video._id,
        message: 'Video is still being generated',
        creatomateStatus: render.status
      });
    }
  } catch (error) {
    console.error('Error checking render status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check render status' },
      { status: 500 }
    );
  }
} 