import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

function isValidTwitterUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      
      // Check if the hostname is twitter.com, www.twitter.com, x.com, or www.x.com
      return hostname === 'twitter.com' || 
             hostname === 'www.twitter.com' || 
             hostname === 'x.com' || 
             hostname === 'www.x.com';
    } catch (error) {
      // If URL parsing fails, it's not a valid URL
      return false;
    }
  }

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session.userId;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {tweetUrl} = body; 

    if (!isValidTwitterUrl(tweetUrl)) {
      return NextResponse.json({ error: "Invalid Twitter URL" }, { status: 400 });
    }
    
    if (!tweetUrl) {
      return NextResponse.json({ error: "Tweet URL is required" }, { status: 400 });
    }

    // Call Exa AI API to get content from the tweet URL
    const exaApiKey = process.env.EXA_API_KEY;
    
    if (!exaApiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const response = await fetch('https://api.exa.ai/contents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${exaApiKey}`
      },
      body: JSON.stringify({
        urls: [tweetUrl],
        text: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Exa API error:", errorData);
      return NextResponse.json(
        { error: "Failed to fetch tweet content" }, 
        { status: response.status }
      );
    }

    const contentData = await response.json();
    
    // Extract the relevant content from the results
    const tweetContent = contentData.results[0].text;
    
    return NextResponse.json({ 
      success: true, 
      tweetContent 
    });
  } catch (error) {
    console.error("Error processing tweet content: ", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}