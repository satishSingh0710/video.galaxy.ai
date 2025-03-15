import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from 'assemblyai';
import VideoCaptions from "@/models/videoCaptionsModel/videoCaptionsModel";
import { dbConnect } from "@/app/lib/db";
import { auth } from '@clerk/nextjs/server';
// Check if API key is available
const apiKey = process.env.ASSEMBLY_AI_API_KEY;
if (!apiKey) {
  console.error("ASSEMBLY_AI_API_KEY is not defined in environment variables");
}

const client = new AssemblyAI({
  apiKey: apiKey as string,
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session.userId;
  if(!userId){
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    console.log("videocaptions/generate: Starting caption generation");
    
    // Parse the request body
    const { id, videoUrl } = await request.json();
    
    // Validate input
    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
      console.error("videocaptions/generate: Invalid video URL provided:", videoUrl);
      return NextResponse.json(
        { error: "Valid video URL is required" },
        { status: 400 }
      );
    }
    
    // Connect to the database
    await dbConnect();
    
    // Find or create the video caption entry
    let videoCaption;
    if (id) {
      videoCaption = await VideoCaptions.findById(id);
      if (!videoCaption) {
        return NextResponse.json(
          { error: "Video caption entry not found" },
          { status: 404 }
        );
      }
    } else {
      videoCaption = new VideoCaptions({
        videoUrl,
        status: 'processing'
      });
    }
    
    // Update status to processing
    videoCaption.status = 'processing';
    await videoCaption.save();
    
    console.log("videocaptions/generate: Processing video URL:", videoUrl);
    
    const data = {
      audio: videoUrl, // AssemblyAI can process video files too
      punctuate: true, // Add punctuation
      format_text: true, // Apply formatting to the transcript
      word_boost: ["video", "caption"], // Boost recognition of these words
    };
    
    console.log("videocaptions/generate: Sending request to AssemblyAI with data:", JSON.stringify(data));
    
    try {
      const transcript = await client.transcripts.transcribe(data);
      console.log("videocaptions/generate: Received transcript response");
      
      if (!transcript) {
        console.error("videocaptions/generate: Transcript is null or undefined");
        videoCaption.status = 'failed';
        await videoCaption.save();
        
        return NextResponse.json(
          { error: "Failed to generate transcript" },
          { status: 500 }
        );
      }
      
      if (!transcript.words || transcript.words.length === 0) {
        console.error("videocaptions/generate: No words detected in transcript:", transcript);
        videoCaption.status = 'failed';
        await videoCaption.save();
        
        return NextResponse.json(
          { error: "No words detected in the video" },
          { status: 500 }
        );
      }
      
      console.log(`videocaptions/generate: Successfully processed transcript with ${transcript.words.length} words`);
      
      // Update the video caption entry with the transcript data
      videoCaption.captions = transcript.words.map(word => ({
        text: word.text,
        start: word.start,
        end: word.end
      }));
      videoCaption.fullText = transcript.text;
      videoCaption.status = 'completed';
      await videoCaption.save();
      
      // Return the words with timing information for captions
      return NextResponse.json({
        success: true,
        message: "Captions generated successfully",
        data: {
          id: videoCaption._id,
          words: transcript.words,
          text: transcript.text,
          status: videoCaption.status
        }
      });
      
    } catch (transcriptError: any) {
      console.error("videocaptions/generate: Error during transcription:", transcriptError);
      
      // Update status to failed
      videoCaption.status = 'failed';
      await videoCaption.save();
      
      throw transcriptError; // Re-throw to be caught by the outer catch block
    }
    
  } catch (error: any) {
    console.error("Error in videocaptions/generate: ", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Handle AssemblyAI specific errors
    if (error.status && error.status >= 400) {
      return NextResponse.json(
        { error: `AssemblyAI error (${error.status}): ${error.message}` },
        { status: error.status }
      );
    }
    
    // Check for network errors
    if (error.name === 'FetchError' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: `Network error: ${error.message}` },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "An unexpected error occurred: " + error.message },
      { status: 500 }
    );
  }
} 