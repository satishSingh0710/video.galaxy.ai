import { NextRequest, NextResponse } from "next/server";
import VideoCaptions from "@/models/videoCaptionsModel/videoCaptionsModel";
import { dbConnect } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log("videocaptions/history: Fetching video captions history");
    
    // Connect to the database
    await dbConnect();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const status = searchParams.get('status') || 'completed';
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Query the database for video captions
    const videoCaptions = await VideoCaptions.find({ status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination
    const total = await VideoCaptions.countDocuments({ status });
    
    console.log(`videocaptions/history: Found ${videoCaptions.length} videos`);
    
    return NextResponse.json({
      success: true,
      data: {
        videos: videoCaptions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
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