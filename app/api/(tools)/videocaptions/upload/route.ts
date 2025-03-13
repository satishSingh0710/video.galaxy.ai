import { NextRequest, NextResponse } from "next/server";
import VideoCaptions from "@/models/videoCaptionsModel/videoCaptionsModel";
import { dbConnect } from "@/app/lib/db";
import { uploadVideo } from "@/app/utils/cloudinary";

export async function POST(request: NextRequest) {
  try {
    console.log("videocaptions/upload: Starting video upload process");
    
    // Parse the request body
    const { videoUrl, title, uploadToCloudinary = false } = await request.json();
    
    // Validate input
    if (!videoUrl || typeof videoUrl !== 'string') {
      console.error("videocaptions/upload: Invalid video URL provided:", videoUrl);
      return NextResponse.json(
        { error: "Valid video URL is required" },
        { status: 400 }
      );
    }
    
    console.log("videocaptions/upload: Processing video URL:", videoUrl);
    
    // Upload to Cloudinary if requested
    let finalVideoUrl = videoUrl;
    if (uploadToCloudinary) {
      try {
        console.log("videocaptions/upload: Uploading to Cloudinary");
        const uploadResult = await uploadVideo(videoUrl, {
          resource_type: 'video',
          folder: 'video-captions'
        });
        finalVideoUrl = uploadResult.secure_url;
        console.log("videocaptions/upload: Uploaded to Cloudinary:", finalVideoUrl);
      } catch (uploadError: any) {
        console.error("videocaptions/upload: Error uploading to Cloudinary:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload video to Cloudinary: " + uploadError.message },
          { status: 500 }
        );
      }
    }
    
    // Connect to the database
    await dbConnect();
    
    // Create a new video caption entry
    const videoCaption = new VideoCaptions({
      videoUrl: finalVideoUrl,
      title: title || 'Untitled Video',
      status: 'pending'
    });
    
    // Save to database
    await videoCaption.save();
    
    console.log("videocaptions/upload: Video entry created with ID:", videoCaption._id);
    
    return NextResponse.json({
      success: true,
      message: "Video uploaded successfully",
      data: {
        id: videoCaption._id,
        videoUrl: finalVideoUrl,
        status: videoCaption.status
      }
    });
    
  } catch (error: any) {
    console.error("Error in videocaptions/upload: ", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred: " + error.message },
      { status: 500 }
    );
  }
} 