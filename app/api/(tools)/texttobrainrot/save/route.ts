"use server"
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/db';
import TextBrainrot from '@/models/textBrainRotModel/textBrainRotModel';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId  = session.userId;
  if(!userId){
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await dbConnect();
    // Parse request body
    const body = await req.json();
    const { 
      inputText, 
      textName, 
      script, 
      audioUrl, 
      captions, 
      voiceId, 
      status, 
      disableCaptions,
      screenRatio,
      bgVideo,
      captionPreset,
      captionAlignment
    } = body;

    // Validate required fields
    if (!inputText || !textName || !script || !audioUrl || !voiceId || typeof disableCaptions !== 'boolean' || !screenRatio || !bgVideo) {
      const missingFields = [];
      if (!inputText) missingFields.push('inputText');
      if (!textName) missingFields.push('textName');
      if (!script) missingFields.push('script');
      if (!audioUrl) missingFields.push('audioUrl');
      if (!voiceId) missingFields.push('voiceId');
      if (typeof disableCaptions !== 'boolean') missingFields.push('disableCaptions');
      if (!screenRatio) missingFields.push('screenRatio');
      if (!bgVideo) missingFields.push('bgVideo');

      return NextResponse.json(
        { success: false, message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Make sure captions are in the correct format (word, start, end)
    const formattedCaptions = Array.isArray(captions) 
      ? captions.map(word => ({
          text: word.text || word.word || '',
          start: word.start || 0,
          end: word.end || 0
        }))
      : [];

    // Create new Text Brainrot record
    const newTextBrainrot = await TextBrainrot.create({
      userId,
      inputText,
      textName,
      script,
      audioUrl,
      captions: formattedCaptions,
      voiceId,
      status: status || 'completed', 
      disableCaptions,
      screenRatio,
      bgVideo, 
      captionPreset,
      captionAlignment
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Text Brainrot data saved successfully',
        data: { id: newTextBrainrot._id }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving Text Brainrot data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to save Text Brainrot data', 
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 