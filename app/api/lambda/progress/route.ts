import {
    speculateFunctionName,
    getRenderProgress,
} from "@remotion/lambda/client";
import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest, response: NextResponse) {
    try {
        // Parse the incoming request body
        let body;
        try {
            const text = await request.text();
            if (!text || text.trim() === '') {
                return NextResponse.json({
                    type: "error",
                    message: "Empty request body",
                }, { status: 400 });
            }
            body = JSON.parse(text);
        } catch (parseError) {
            console.error("Error parsing request body:", parseError);
            return NextResponse.json({
                type: "error",
                message: "Invalid request body format",
            }, { status: 400 });
        }

        const { id } = body;

        if (!id) {
            return NextResponse.json({
                type: "error",
                message: "Missing renderId parameter",
            }, { status: 400 });
        }

        if (!process.env.REMOTION_LAMBDA_BUCKET_NAME) {
            return NextResponse.json({
                type: "error",
                message: "Missing REMOTION_LAMBDA_BUCKET_NAME environment variable",
            }, { status: 500 });
        }

        try {
            const functionName = speculateFunctionName({
                diskSizeInMb: parseInt(process.env.REMOTION_LAMBDA_DISK_SIZE_IN_MB as string),
                memorySizeInMb: parseInt(process.env.REMOTION_LAMBDA_MEMORY_SIZE_IN_MB as string),
                timeoutInSeconds: parseInt(process.env.REMOTION_LAMBDA_TIMEOUT_IN_SECONDS as string),
            });

            console.log(`Checking progress for render ID: ${id} in bucket: ${process.env.REMOTION_LAMBDA_BUCKET_NAME}`);
            
            const renderProgress = await getRenderProgress({
                bucketName: process.env.REMOTION_LAMBDA_BUCKET_NAME as string,
                functionName,
                region: "us-east-2",
                renderId: id,
            });
            
            // Additional validation to handle potential empty responses
            if (!renderProgress) {
                console.warn(`Empty renderProgress response for ID: ${id}`);
                return NextResponse.json({
                    type: "error",
                    message: "Received empty response from AWS. The render may have been terminated.",
                }, { status: 500 });
            }
        
            if (renderProgress.fatalErrorEncountered) {
                const errorMessage = renderProgress.errors && renderProgress.errors.length > 0
                    ? renderProgress.errors[0]?.message
                    : "An unknown error occurred during rendering";
                
                console.error(`Fatal error encountered for render ID ${id}:`, errorMessage);
                return NextResponse.json({
                    type: "error",
                    message: errorMessage || "An unknown error occurred",
                });
            }
        
            if (renderProgress.done) {
                console.log(`Render complete for ID: ${id}, output file: ${renderProgress.outputFile}`);
                return NextResponse.json({
                    type: "done",
                    url: renderProgress.outputFile as string,
                    size: renderProgress.outputSizeInBytes as number,
                });
            }
        
            // Ensure we have a valid progress value
            const progress = typeof renderProgress.overallProgress === 'number'
                ? Math.max(0.03, renderProgress.overallProgress)
                : 0.03;
                
            return NextResponse.json({
                type: "progress",
                progress,
            });
        } catch (awsError: any) {
            // Check if the response was empty or malformed
            if (awsError.message?.includes("Unexpected end of JSON input") ||
                awsError.message?.includes("Invalid JSON") ||
                awsError.message?.includes("Unexpected token")) {
                console.warn(`Invalid or empty response from AWS for render ID: ${id}`);
                return NextResponse.json({
                    type: "error",
                    message: "Received invalid response from AWS. The render job may have terminated unexpectedly.",
                    retryable: true
                }, { status: 500 });
            }
            
            // Check for AWS concurrency limits - this is different from API rate limits
            if (awsError.message?.includes("Concurrency limit reached") ||
                awsError.message?.includes("AWS Concurrency limit reached")) {
                
                console.error("AWS Lambda concurrency limit reached:", awsError.message);
                
                return NextResponse.json({
                    type: "concurrency-limit",
                    message: "AWS Lambda concurrency limit reached. This means too many render jobs are running simultaneously.",
                    details: "You need to wait for some of your existing renders to complete, or increase your AWS Lambda concurrency limit. See https://www.remotion.dev/docs/lambda/troubleshooting/rate-limit for more information.",
                    retryAfter: 30 // Increase to 30 seconds for concurrency issues
                }, { 
                    status: 429,
                    headers: {
                        'Retry-After': '30'
                    }
                });
            }
            
            // Check for rate limiting errors
            if (awsError.message?.includes("Rate Exceeded") || 
                awsError.code === "ThrottlingException" || 
                awsError.statusCode === 429) {
                
                console.warn("AWS rate limit exceeded when checking render progress");
                
                // Suggest a longer wait time for the client
                const headers = new Headers();
                headers.append("Retry-After", "10"); // Increase to 10 seconds
                
                return NextResponse.json({
                    type: "rate-limited",
                    message: "Rate limit exceeded. Please slow down your requests.",
                    retryAfter: 10 // Explicitly include in the response body as well
                }, { 
                    status: 429,
                    headers 
                });
            }
            
            // Re-throw for other AWS errors to be caught by the outer catch
            throw awsError;
        }
    } catch (error: any) {
        console.error("Error in progress API:", error);
        return NextResponse.json({
            type: "error",
            message: error.message || "An unknown error occurred while checking render progress",
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}