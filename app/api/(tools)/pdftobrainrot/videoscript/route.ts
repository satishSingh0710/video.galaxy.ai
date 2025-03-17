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
                    content: "You have to write a video script. Keep it as a paragraph and in the form of a story. The script should be in the same language as the text provided. Whatever script you generate, that's going to be naratted as it is. Do not add any additional commentary or explanations. Do not use headlines like narrator: or speaker: or anything like that. Just write the script as it is. Something which a dumb person can read as it is and please will understand. Please keep it brief and to the point. Very very important: Do not exceed the narration length of the script to 300 words."
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