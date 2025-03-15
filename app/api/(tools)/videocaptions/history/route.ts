import { NextRequest, NextResponse } from "next/server";
import VideoCaptions from "@/models/videoCaptionsModel/videoCaptionsModel";
import { dbConnect } from "@/app/lib/db";
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  // Properly await the auth function before destructuring
  const session = await auth();
  const userId = session.userId;
  
  if(!userId){
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    console.log("videocaptions/history: Fetching video captions history");
    
    // Connect to the database
    await dbConnect();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'completed';
    
    
    // Query the database for video captions
    const videoCaptions = await VideoCaptions.find({ status })
      .sort({ createdAt: -1 })
    
    console.log(`videocaptions/history: Found ${videoCaptions.length} videos`);
    
    return NextResponse.json({
      success: true,
      data: {
        videos: videoCaptions
      }
    });
    
  } catch (error: any) {
    console.error("Error in videocaptions/history: ", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred: " + error.message },
      { status: 500 }
    );
  }
} 