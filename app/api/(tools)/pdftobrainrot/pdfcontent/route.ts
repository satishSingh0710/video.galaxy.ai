import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { auth } from '@clerk/nextjs/server';
// Initialize Gemini AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if(!userId){
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        // Parse request body
        const { pdfUrl, fileName, identifierId } = await req.json();

        // Validate required fields
        if (!pdfUrl || !identifierId) {
            return NextResponse.json(
                { error: 'PDF URL and identifierId are required' },
                { status: 400 }
            );
        }

        try {
            // Fetch the PDF file from the UploadCare URL
            const fileResponse = await fetch(pdfUrl);
            if (!fileResponse.ok) {
                throw new Error(`Failed to fetch PDF from URL: ${fileResponse.statusText}`);
            }
            
            const fileBlob = await fileResponse.blob();
            
            // Use Gemini API to extract text from PDF
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            // Convert file to base64 for Gemini
            const fileData = {
                inlineData: {
                    data: Buffer.from(await fileBlob.arrayBuffer()).toString('base64'),
                    mimeType: fileBlob.type || 'application/pdf',
                }
            } as Part;

            // Prepare the prompt for better text extraction
            const prompt = "Extract all the text content from this PDF document. Please extract all text content, preserving paragraphs and structure as much as possible. Return only the extracted text without any additional commentary.";
            
            // Generate content with Gemini using the file directly
            const result = await model.generateContent([
                prompt,
                fileData
            ]);

            console.log("result from pdfcontent: ", result);

            const response = await result.response;
            const extractedText = response.text();
            console.log("extractedText from pdfcontent: ", extractedText);
    

            // Return success response
            return NextResponse.json({
                success: true,
                data: {
                    extractedText,
                    fileName
                }
            });

        } catch (error) {
            console.error('PDF processing error:', error);
            return NextResponse.json(
                { error: 'Failed to process PDF file' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Route handler error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Configure the maximum request size
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};



