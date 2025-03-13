"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UploadCareModal from "@/components/shared/UploadCareModal";
import { Loader2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import HistoryModal from "./components/HistoryModal";

// Define the video file type
interface VideoFile {
  name?: string;
  cdnUrl?: string;
  [key: string]: any;
}

export default function VideoCaptionsPage() {
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [captions, setCaptions] = useState("");
  const [captionId, setCaptionId] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const { toast } = useToast();

  const handleGenerateCaptions = async () => {
    if (!videoFile) {
      toast({
        title: "No video selected",
        description: "Please upload a video first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      setProgress(0);
      
      // Step 1: Upload the video to Cloudinary if it's not already there
      let videoUrl = videoFile.cdnUrl || '';
      let uploadResponse;
      
      if (!videoUrl.includes('cloudinary')) {
        // Upload to Cloudinary first
        setLoadingMessage("Uploading video to cloud storage...");
        setProgress(25);
        const uploadData = {
          videoUrl: videoUrl,
          title: videoFile.name || 'Untitled Video',
          uploadToCloudinary: true
        };
        
        const uploadRes = await fetch('/api/videocaptions/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(uploadData),
        });
        
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || 'Failed to upload video');
        }
        
        uploadResponse = await uploadRes.json();
        videoUrl = uploadResponse.data.videoUrl;
        setProgress(50);
      } else {
        // Skip upload step
        setProgress(50);
      }
      
      // Step 2: Generate captions from the video
      setLoadingMessage("Generating captions from video...");
      setProgress(75);
      const generateData = {
        videoUrl: videoUrl,
        id: uploadResponse?.data?.id || null,
      };
      
      const generateRes = await fetch('/api/videocaptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateData),
      });
      
      if (!generateRes.ok) {
        const errorData = await generateRes.json();
        throw new Error(errorData.error || 'Failed to generate captions');
      }
      
      const captionsResponse = await generateRes.json();
      
      // Set the captions and caption ID
      setCaptions(captionsResponse.data.text);
      setCaptionId(captionsResponse.data.id);
      setLoadingMessage("Completed");
      setProgress(100);
      
      toast({
        title: "Captions generated",
        description: "Your video captions have been successfully generated",
      });
    } catch (error) {
      setLoadingMessage("");
      setProgress(0);
      toast({
        title: "Failed to generate captions",
        description: error instanceof Error ? error.message : "There was an error generating captions for your video",
        variant: "destructive",
      });
      console.error("Error generating captions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Video Captions Generator</h1>
            <p className="text-muted-foreground">Upload a video and generate accurate captions</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setIsHistoryModalOpen(true)}
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Video</CardTitle>
            <CardDescription>
              Select a video file to generate captions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadCareModal
              files={videoFile}
              setFiles={setVideoFile}
              minFiles={1}
              maxFiles={1}
              acceptFileTypes="video/*"
              modalId="video-upload"
            />
            
            {videoFile && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Selected Video:</p>
                <div className="rounded-md overflow-hidden bg-muted p-2">
                  <p className="text-sm truncate">{videoFile.name || "Video file"}</p>
                  {videoFile.cdnUrl && (
                    <video 
                      className="w-full h-auto mt-2 rounded" 
                      controls
                      src={videoFile.cdnUrl}
                    />
                  )}
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t mt-6 space-y-4">
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{loadingMessage}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
              
              <Button 
                onClick={handleGenerateCaptions} 
                disabled={!videoFile || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {loadingMessage || "Processing..."}
                  </>
                ) : (
                  "Generate Captions"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {captions && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Captions</CardTitle>
              <CardDescription>
                Your video captions are ready
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted p-4 max-h-[300px] overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap">{captions}</pre>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(captions);
                  toast({
                    title: "Copied to clipboard",
                    description: "Captions have been copied to your clipboard",
                  });
                }}
              >
                Copy Captions
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      <HistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
      />
    </div>
  );
}
