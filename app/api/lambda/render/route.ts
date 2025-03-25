import {renderMediaOnLambda, RenderMediaOnLambdaInput,speculateFunctionName} from "@remotion/lambda/client";

import { NextRequest, NextResponse } from "next/server";


const webhook: RenderMediaOnLambdaInput['webhook'] = {
    url: 'https://mapsnap.app/api/webhook',
    secret: null,
};

export async function POST(request: NextRequest, response: NextResponse){
    const body = await request.json();
    if(!process.env.REMOTION_AWS_ACCESS_KEY_ID || !process.env.REMOTION_AWS_SECRET_ACCESS_KEY){
        return NextResponse.json({error: "AWS credentials not found"}, {status: 500});
    }

    const result = await renderMediaOnLambda({
        codec: "h264",
        functionName: speculateFunctionName({
            diskSizeInMb: parseInt(process.env.REMOTION_LAMBDA_DISK_SIZE_IN_MB as string),
            memorySizeInMb: parseInt(process.env.REMOTION_LAMBDA_MEMORY_SIZE_IN_MB as string),
            timeoutInSeconds: parseInt(process.env.REMOTION_LAMBDA_TIMEOUT_IN_SECONDS as string),
        }),
        region: "us-east-2",
        serveUrl: process.env.REMOTION_LAMBDA_SERVE_URL as string,
        composition: body.id, 
        inputProps: body.inputProps,
        framesPerLambda: 10,
        downloadBehavior: {
            type: "download", 
            fileName: "output.mp4",
        }, 
        webhook: webhook
    })
    return NextResponse.json(result);
}

