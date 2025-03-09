import { NextRequest, NextResponse } from 'next/server';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia, RenderMediaOnProgress } from '@remotion/renderer';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { uploadToCloudinary } from '../../../../utils/cloudinary';

export const maxDuration = 300; // 5 minutes timeout

export async function POST(request: NextRequest) {
  try {
    const { segments } = await request.json();

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json(
        { error: 'Invalid segments data. Expected non-empty array.' },
        { status: 400 }
      );
    }

    // Validate segments data
    for (const segment of segments) {
      if (!segment.contextText || !segment.imageUrl || !segment.words || !Array.isArray(segment.words)) {
        return NextResponse.json(
          { error: 'Invalid segment data. Each segment must have contextText, imageUrl, and words array.' },
          { status: 400 }
        );
      }
    }

    // Calculate total duration based on the words timing
    const totalDurationInSeconds = segments.reduce((acc, segment) => {
      const lastWord = segment.words[segment.words.length - 1];
      return acc + lastWord.end + 0.5; // Add a small buffer after each segment
    }, 0);

    // Convert to frames (at 30fps)
    const totalFrames = Math.ceil(totalDurationInSeconds * 30);

    // Create a temporary directory for the output
    const outputDir = path.join(os.tmpdir(), 'remotion-renders');
    fs.mkdirSync(outputDir, { recursive: true });
    
    const outputFilename = `tiktok-video-${uuidv4()}.mp4`;
    const outputPath = path.join(outputDir, outputFilename);

    // Get the absolute path to the entry point file
    const entryPoint = path.join(process.cwd(), 'app/components/remotion/TikTokVideo.tsx');

    // Bundle the video
    const bundleResult = await bundle({
      entryPoint,
    });

    // Get the composition
    const compositions = await getCompositions(bundleResult);
    const composition = compositions.find((c) => c.id === 'TikTokVideo');

    if (!composition) {
      throw new Error('Could not find TikTokVideo composition');
    }

    // Render the video
    await renderMedia({
      composition,
      serveUrl: bundleResult,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: {
        segments
      },
    });

    // Upload to Cloudinary
    const videoUrl = await uploadToCloudinary(outputPath, 'video');

    // Clean up the temporary file
    fs.unlinkSync(outputPath);

    return NextResponse.json({ videoUrl });
  } catch (error) {
    console.error('Error rendering video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to render video' },
      { status: 500 }
    );
  }
} 