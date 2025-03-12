import { NextResponse } from 'next/server';
import { dbConnect } from "@/app/lib/db";
import TikTokVideo from "@/models/tiktokVideoModel/tiktokvideomodel";

export async function DELETE(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  try {
    const videoId = params.videoId;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find and delete the video
    const deletedVideo = await TikTokVideo.findByIdAndDelete(videoId);

    if (!deletedVideo) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Return success response
    return NextResponse.json(
      { message: 'Video deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
} 