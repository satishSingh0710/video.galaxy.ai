import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import { auth } from '@clerk/nextjs/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
    const session = await auth();
    const userId  = session.userId;
    if(!userId){
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const body = await request.json();
        const { script } = body;
        
        // Validate input
        if (!script || typeof script !== 'string' || script.trim() === '') {
            return NextResponse.json(
                { error: "Script is required and must be a non-empty string" },
                { status: 400 }
            );
        }
        
        const prompt = `  
        1. The output response should be exactly what I want in the json format.
        2. Not a single word should be out of context.
        3. The output should be an array of objects.
        4. Each object should have 2 keys, ContextText and ImagePrompt.
        5. ContextText is the part that the narrator will say and ImagePrompt is the prompt to generate the image what will be rendered for the time narrator will say that.
        6. The output should be an array of objects. 
        7. The array should be named as "result". 
        8. Please don't add any other thing to the script and the ContextText outside of the words used in the script. 
        9. Sentence structure should be same as the script.
        
        The script is: ${script}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        
        if (!content) {
            return NextResponse.json(
                { error: "Failed to generate script segments and image prompts" },
                { status: 500 }
            );
        }
        
        const data = JSON.parse(content);

        console.log("getScriptAndImagePrompts: ", data);
        
        // Log for debugging purposes only in development
        if (process.env.NODE_ENV === 'development') {
            console.log(data);
        }
        
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error processing script for image prompts:", error);
        
        // Handle JSON parse errors separately
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: "Failed to parse AI response" },
                { status: 500 }
            );
        }
        
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