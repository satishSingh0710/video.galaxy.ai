import { NextRequest, NextResponse } from "next/server";
import PdfBrainrot from "@/models/pdfBrainRotModel/pdfBrainRotModel";
import { dbConnect } from "@/app/lib/db";
import { auth } from '@clerk/nextjs/server';

export async function DELETE(request: NextRequest) {
  // Get user session
  const session = await auth();
  const userId = session.userId;
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Connect to the database
    await dbConnect();
    
    // Get video ID from query parameters
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');
    
    if (!videoId) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }
    
    console.log(`pdftobrainrot/delete: Attempting to delete video with ID: ${videoId}`);
    
    // Find the video and verify it belongs to the user
    const video = await PdfBrainrot.findOne({ _id: videoId, userId });
    
    if (!video) {
      return NextResponse.json({ error: "Video not found or unauthorized" }, { status: 404 });
    }
    
    // Delete the video
    await PdfBrainrot.deleteOne({ _id: videoId, userId });
    
    console.log(`pdftobrainrot/delete: Successfully deleted video with ID: ${videoId}`);
    
    return NextResponse.json({
      success: true,
      message: "Video deleted successfully"
    });
    
  } catch (error: any) {
    console.error("Error in pdftobrainrot/delete: ", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred: " + error.message },
      { status: 500 }
    );
  }
} 