import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/db';
import PdfBrainrot from '@/models/pdfBrainRotModel/pdfBrainRotModel';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    // Parse request body
    const body = await req.json();
    const { 
      pdfUrl, 
      pdfName, 
      extractedText, 
      script, 
      audioUrl, 
      captions, 
      voiceId, 
      status 
    } = body;

    // Validate required fields
    if (!pdfUrl || !pdfName || !extractedText || !script || !audioUrl || !voiceId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
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

    // Create new PDF Brainrot record
    const newPdfBrainrot = await PdfBrainrot.create({
      pdfUrl,
      pdfName,
      extractedText,
      script,
      audioUrl,
      captions: formattedCaptions,
      voiceId,
      status: status || 'completed'
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'PDF Brainrot data saved successfully',
        data: { id: newPdfBrainrot._id }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving PDF Brainrot data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to save PDF Brainrot data', 
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 