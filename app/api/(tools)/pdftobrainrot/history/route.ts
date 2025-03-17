import { NextRequest, NextResponse } from "next/server";
import PdfBrainrot from "@/models/pdfBrainRotModel/pdfBrainRotModel";
import { dbConnect } from "@/app/lib/db";
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  // Get user session
  const session = await auth();
  const userId = session.userId;
  
  if(!userId){
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    console.log("pdftobrainrot/history: Fetching video history");
    
    // Connect to the database
    await dbConnect();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'completed';
    
    // Query the database for videos
    const videos = await PdfBrainrot.find({ userId, status })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    console.log(`pdftobrainrot/history: Found ${videos.length} videos`);
    
    return NextResponse.json({
      success: true,
      data: {
        videos
      }
    });
    
  } catch (error: any) {
    console.error("Error in pdftobrainrot/history: ", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred: " + error.message },
      { status: 500 }
    );
  }
} 