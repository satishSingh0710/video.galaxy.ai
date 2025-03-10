import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/app/lib/db";
import TikTokVideo from "@/models/tiktokVideoModel/tiktokvideomodel";

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();

    // Get data from request body
    const data = await request.json();
    const { script, audioUrl, images, captions } = data;

    // Validate required fields
    if (!script || !audioUrl || !images || !captions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create new TikTok video document
    const tikTokVideo = new TikTokVideo({
      script,
      audioUrl,
      images: images.map((segment: any) => ({
        contextText: segment.ContextText,
        imageUrl: segment.imageUrl
      })),
      captions: captions.map((word: any) => ({
        text: word.text,
        start: word.start,
        end: word.end
      }))
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
  try {
    await dbConnect();
    const videos = await TikTokVideo.find();
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
