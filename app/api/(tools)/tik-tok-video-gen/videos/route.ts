import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/app/lib/db";
import TikTokVideo from "@/models/tiktokVideoModel/tiktokvideomodel";
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId  = session.userId;
  if(!userId){
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Connect to database
    await dbConnect();

    // Get data from request body
    const data = await request.json();
    const { script, audioUrl, images, captions, captionPreset, captionAlignment, disableCaptions, audioDuration, screenRatio } = data;

    // Validate required fields
    if (!script || !audioUrl || !images) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate captions if they're not disabled
    if (!disableCaptions && !captions) {
      return NextResponse.json(
        { error: "Captions are required when not disabled" },
        { status: 400 }
      );
    }

    // Create new TikTok video document
    const tikTokVideo = new TikTokVideo({
      userId,
      script,
      audioUrl,
      images: images.map((segment: any) => ({
        contextText: segment.ContextText,
        imageUrl: segment.imageUrl
      })),
      captions: captions ? captions.map((word: any) => ({
        text: word.text,
        start: word.start,
        end: word.end
      })) : [],
      captionPreset,
      captionAlignment,
      disableCaptions: !!disableCaptions,
      audioDuration: audioDuration || 0,
      screenRatio: screenRatio || '1/1'
    });

    // Save to database
    await tikTokVideo.save();

    return NextResponse.json({
      success: true,
      message: "TikTok video data saved successfully",
      videoId: tikTokVideo._id
    });

  } catch (error: any) {
    console.error("Error saving TikTok video data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save TikTok video data" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest){
  const { userId } = await auth();
  if(!userId){
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await dbConnect();
    const videos = await TikTokVideo.find({userId});
    console.log(videos);
    return NextResponse.json(videos);
  } catch (error: any) {
    console.error("Error fetching TikTok videos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch TikTok videos" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if(!userId){
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await dbConnect();
    const { id } = await request.json();
    await TikTokVideo.deleteMany({userId, _id: id}); 
    return NextResponse.json({ message: "TikTok video deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting TikTok video:", error);
    return NextResponse.json({ error: error.message || "Failed to delete TikTok video" }, { status: 500 });
  }
}



