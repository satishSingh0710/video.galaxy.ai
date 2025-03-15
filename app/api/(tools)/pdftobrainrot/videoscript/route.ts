import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
    const session = await auth();
    const userId  = session.userId;
    if(!userId){
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        console.log("videoscript: Starting script generation");
        const { extractedText } = await request.json();

        if (!extractedText) {
            console.error("videoscript: No text provided");
            return NextResponse.json({ error: "Text content is required" }, { status: 400 });
        }

        console.log(`videoscript: Processing text of length ${extractedText.length}`);

        // Generate video script using OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a professional video script writer. Convert the given text into an engaging, concise video script that's easy to follow and understand. The script should be conversational, clear, and maintain the key points while being suitable for video narration. Make sure that the script it not more than 400 words, but it should summarize the main points of the text. The script should be in the same language as the text provided. Whatever script you generate, that's going to be naratted as it is. Do not add any additional commentary or explanations."
                },
                {
                    role: "user",
                    content: `Please convert this text into a video script: ${extractedText}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1500
        });

        const videoScript = completion.choices[0].message.content;

        if (!videoScript) {
            console.error("videoscript: No script generated");
            return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
        }

        console.log("videoscript: Successfully generated script", videoScript);

        return NextResponse.json({
            success: true,
            script: videoScript
        });

    } catch (error: any) {
        console.error('Error generating video script:', error);
        
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate video script' },
            { status: 500 }
        );
    }
} 