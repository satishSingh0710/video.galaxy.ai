import { NextRequest, NextResponse } from 'next/server';
import { uploadAudioBuffer } from '@/app/utils/cloudinary';
import { Readable } from 'stream';
import { auth } from '@clerk/nextjs/server';

// Check if API key is available
const apiKey = process.env.ELEVEN_LAB_API_KEY;
if (!apiKey) {
    console.error("ELEVEN_LAB_API_KEY is not defined in environment variables");
}

import { ElevenLabsClient } from "elevenlabs";
const client = new ElevenLabsClient({ apiKey: apiKey });

// Helper function to convert a ReadableStream to a Buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
    try {
        // Check if it's a Node18UniversalStreamWrapper (from ElevenLabs)
        if (stream.readableStream && stream.reader) {
            console.log("getaudio: Processing ReadableStream from fetch API");
            // Handle ReadableStream from fetch API
            const reader = stream.reader;
            const chunks: Uint8Array[] = [];
            
            // Read all chunks from the stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            
            // Concatenate all chunks into a single Uint8Array
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            console.log(`getaudio: Total audio length: ${totalLength} bytes`);
            
            const result = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }
            
            return Buffer.from(result);
        } else if (stream instanceof Readable) {
            console.log("getaudio: Processing Node.js Readable stream");
            // Handle Node.js Readable stream
            return new Promise<Buffer>((resolve, reject) => {
                const chunks: Buffer[] = [];
                stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
                stream.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    console.log(`getaudio: Total audio length: ${buffer.length} bytes`);
                    resolve(buffer);
                });
                stream.on('error', (err) => {
                    console.error("getaudio: Error in Readable stream:", err);
                    reject(err);
                });
            });
        } else {
            console.error("getaudio: Unsupported stream type:", typeof stream);
            throw new Error('Unsupported stream type');
        }
    } catch (error) {
        console.error("getaudio: Error in streamToBuffer:", error);
        throw error;
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();
    const userId  = session.userId;
    if(!userId){
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        console.log("getaudio: Starting audio generation");
        // Parse the request body
        const body = await request.json();
        
        // Validate body exists
        if (!body) {
            console.error("getaudio: Request body is missing");
            return NextResponse.json({ error: "Request body is required" }, { status: 400 });
        }

        const { text, voiceId = "BFqnCBsd6RMkjVDRZzb" } = body;

        // Validate text exists before accessing its length
        if (!text) {
            console.error("getaudio: Text is required but was not provided");
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }
        
        if (!voiceId) {
            console.error("getaudio: Voice ID is required but was not provided");
            return NextResponse.json({ error: "Voice ID is required" }, { status: 400 });
        }
        
        console.log(`getaudio: Processing text (${text.length} chars) with voiceId: ${voiceId}`);
        
        // Generate audio using Eleven Labs
        console.log("getaudio: Sending request to ElevenLabs");
        const audioStream = await client.textToSpeech.convert(voiceId, {
            output_format: "mp3_44100_128",
            text: text, 
            model_id: "eleven_multilingual_v2"
        });

        console.log("getaudio: Received audio stream from ElevenLabs");
        
        // Convert the stream to a buffer
        const audioBuffer = await streamToBuffer(audioStream);

        console.log(`getaudio: Converted stream to buffer of size: ${audioBuffer.length} bytes`);
        
        if (!audioBuffer || audioBuffer.length === 0) {
            console.error("getaudio: Audio buffer is empty");
            return NextResponse.json({ error: "Failed to generate audio (empty buffer)" }, { status: 500 });
        }
        
        // Upload the audio buffer to Cloudinary
        console.log("getaudio: Uploading audio buffer to Cloudinary");
        const cloudinaryResponse = await uploadAudioBuffer(audioBuffer, {
            resource_type: 'auto',
            folder: 'tweettovideo-audio',
            unique_filename: true
        });
        
        console.log("getaudio: Successfully uploaded to Cloudinary:", cloudinaryResponse.secure_url);
        
        // Return the Cloudinary response with the audio URL and other details
        return NextResponse.json({
            audioUrl: cloudinaryResponse.secure_url,
            duration: cloudinaryResponse.duration,
            public_id: cloudinaryResponse.public_id,
            format: cloudinaryResponse.format,
            bytes: cloudinaryResponse.bytes,
            original_filename: cloudinaryResponse.original_filename
        });
    } catch (error: any) {
        console.error('Error processing audio:', error);
        
        // Safely stringify error object
        const errorDetails = {
            message: error.message || 'Unknown error',
            name: error.name,
            status: error.status,
            code: error.code,
            stack: error.stack
        };
        console.error("Error details:", JSON.stringify(errorDetails));
        
        // Handle specific ElevenLabs errors
        if (error.status && error.status >= 400) {
            return NextResponse.json(
                { error: `ElevenLabs error (${error.status}): ${error.message}` },
                { status: error.status }
            );
        }
        
        // Handle network errors
        if (error.name === 'FetchError' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return NextResponse.json(
                { error: `Network error: ${error.message}` },
                { status: 503 }
            );
        }
        
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process audio' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
   try {
       console.log("getaudio: Getting all voices from ElevenLabs");
       const voices = await client.voices.getAll();
       console.log(`getaudio: Retrieved ${voices.voices.length} voices`);
       return NextResponse.json(voices);
   } catch (error: any) {
       console.error('Error getting voices:', error);
       return NextResponse.json(
           { error: error instanceof Error ? error.message : 'Failed to get voices' },
           { status: 500 }
       );
   }
} 