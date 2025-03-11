import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { uploadToCloudinary } from "@/app/utils/cloudinary";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { imagePrompt, preset } = body;

        console.log("imagePrompt = ", imagePrompt);

        // Validate input
        if (!imagePrompt || typeof imagePrompt !== 'string' || imagePrompt.trim() === '') {
            console.log("imagePrompt is required and must be a non-empty string");
            return NextResponse.json(
                { error: "Image prompt is required and must be a non-empty string" },
                { status: 400 }
            );
        }

        // Generate image using DALL-E
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: `A ${preset} image of ${imagePrompt}`,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            response_format: "url",
        });

        // Extract the image URL from the response
        const imageUrl = response.data[0]?.url;
        console.log("imageUrl = ", imageUrl);

        if (!imageUrl) {
            return NextResponse.json(
                { error: "Failed to generate image" },
                { status: 500 }
            );
        }

        // Upload the generated image to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(imageUrl, 'image');
        
        if (!cloudinaryUrl) {
            return NextResponse.json(
                { error: "Failed to upload image to Cloudinary" },
                { status: 500 }
            );
        }

        // Return the Cloudinary URL
        return NextResponse.json({ imageUrl: cloudinaryUrl });
    } catch (error: any) {
        console.error("Error in tik-tok-video-gen/getImages: ", error);
        
        // Handle OpenAI API errors
        if (error.name === 'OpenAIError') {
            return NextResponse.json(
                { error: "AI service error: " + error.message },
                { status: 503 }
            );
        }
        
        return NextResponse.json(
            { error: "An unexpected error occurred: " + error.message },
            { status: 500 }
        );
    }
}