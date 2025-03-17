import { NextRequest, NextResponse } from "next/server";
import { auth } from '@clerk/nextjs/server';
import { dbConnect } from "@/app/lib/db";
import TweetVideoModel from "@/models/tweetVideoModel/tweetVideoModel";

export async function POST(request: NextRequest) {
    const session = await auth();
    const userId = session.userId;
    
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    try {
       await dbConnect();
        
        const body = await request.json();
        const {
            title,
            script,
            audioUrl,
            duration,
            images,
            captions,
            captionPreset,
            captionAlignment,
            screenRatio,
        } = body;
        
        // Validate required fields
        if (!title || !script || !audioUrl || !images || !Array.isArray(images)) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }
        
        // Create video document
        const video = new TweetVideoModel({
            userId,
            title,
            script,
            audioUrl,
            duration: duration || 0,
            images,
            captions: captions || [],
            captionPreset: captionPreset || "BASIC",
            captionAlignment: captionAlignment || "bottom",
            screenRatio: screenRatio || "9/16",
            createdAt: new Date().toISOString()
        });
        
        // Save to database using Mongoose
        const savedVideo = await video.save();
        
        return NextResponse.json({
            success: true,
            videoId: savedVideo._id
        });
    } catch (error: any) {
        console.error("Error saving video:", error);
        return NextResponse.json(
            { error: "Failed to save video: " + error.message },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const session = await auth();
    const userId = session.userId;
    
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    try {
        await dbConnect();
        
        // Get query parameters
        const url = new URL(request.url);
        const videoId = url.searchParams.get("id");
        
        if (videoId) {
            // Get a specific video using Mongoose
            const video = await TweetVideoModel.findOne({
                _id: videoId,
                userId
            });
            
            if (!video) {
                return NextResponse.json(
                    { error: "Video not found" },
                    { status: 404 }
                );
            }
            
            return NextResponse.json({ video });
        } else {
            // Get all videos for the user using Mongoose
            const videos = await TweetVideoModel
                .find({ userId })
                .sort({ createdAt: -1 });
            
            return NextResponse.json({ videos });
        }
    } catch (error: any) {
        console.error("Error fetching videos:", error);
        return NextResponse.json(
            { error: "Failed to fetch videos: " + error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const session = await auth();
    const userId = session.userId;
    
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    try {
        await dbConnect();
        
        // Get query parameters
        const url = new URL(request.url);
        const videoId = url.searchParams.get("id");
        
        if (!videoId) {
            return NextResponse.json(
                { error: "Video ID is required" },
                { status: 400 }
            );
        }
        
        // Delete the video using Mongoose
        const result = await TweetVideoModel.deleteOne({
            _id: videoId,
            userId
        });
        
        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "Video not found or you don't have permission to delete it" },
                { status: 404 }
            );
        }
        
        return NextResponse.json({
            success: true,
            message: "Video deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting video:", error);
        return NextResponse.json(
            { error: "Failed to delete video: " + error.message },
            { status: 500 }
        );
    }
} 