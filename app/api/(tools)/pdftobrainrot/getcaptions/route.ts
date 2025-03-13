import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from 'assemblyai';

// Check if API key is available
const apiKey = process.env.ASSEMBLY_AI_API_KEY;
if (!apiKey) {
    console.error("ASSEMBLY_AI_API_KEY is not defined in environment variables");
}

const client = new AssemblyAI({
    apiKey: apiKey as string,
});

export async function POST(request: NextRequest) {
    try {
        console.log("getcaptions: Starting caption generation");
        const { audioUrl } = await request.json();
        
        // Validate input
        if (!audioUrl || typeof audioUrl !== 'string' || !audioUrl.startsWith('http')) {
            console.error("getcaptions: Invalid audio URL provided:", audioUrl);
            return NextResponse.json(
                { error: "Valid audio URL is required" },
                { status: 400 }
            );
        }
        
        console.log("getcaptions: Processing audio URL:", audioUrl);
        
        const data = {
            audio: audioUrl,
            word_boost: [], // Add any words to boost recognition if needed
            punctuate: true, // Add punctuation
            format_text: true, // Apply formatting to the transcript
        };
        
        console.log("getcaptions: Sending request to AssemblyAI with data:", JSON.stringify(data));
        
        try {
            const transcript = await client.transcripts.transcribe(data);
            console.log("getcaptions: Received transcript response");
            
            if (!transcript) {
                console.error("getcaptions: Transcript is null or undefined");
                return NextResponse.json(
                    { error: "Failed to generate transcript" },
                    { status: 500 }
                );
            }
            
            if (!transcript.words || transcript.words.length === 0) {
                console.error("getcaptions: No words detected in transcript:", transcript);
                return NextResponse.json(
                    { error: "No words detected in the audio" },
                    { status: 500 }
                );
            }
            
            console.log(`getcaptions: Successfully processed transcript with ${transcript.words.length} words`);
            
            // Return the words with timing information for captions
            return NextResponse.json({
                words: transcript.words,
                text: transcript.text
            });
        } catch (transcriptError: any) {
            console.error("getcaptions: Error during transcription:", transcriptError);
            throw transcriptError; // Re-throw to be caught by the outer catch block
        }
    } catch (error: any) {
        console.error("Error in pdftobrainrot/getcaptions: ", error);
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