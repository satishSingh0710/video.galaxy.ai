"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UploadCareModal from "@/components/shared/UploadCareModal";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VoiceSelector from "../tik-tok-video-gen/components/VoiceSelector";

// Define the PDF file type
interface PdfFile {
  name?: string;
  cdnUrl?: string;
  [key: string]: any;
}

export default function PdfToBrainrotPage() {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const { toast } = useToast();

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
  };

  const handleProcessPdf = async () => {
    if (!pdfFile) {
      toast({
        title: "No PDF selected",
        description: "Please upload a PDF file first",
        variant: "destructive",
      });
      return;
    }

    if (!selectedVoice) {
      toast({
        title: "No voice selected",
        description: "Please select a voice first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // Step 1: Extract text from PDF
      const extractResponse = await fetch('/api/pdftobrainrot/pdfcontent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfUrl: pdfFile.cdnUrl,
          fileName: pdfFile.name,
          identifierId: Date.now().toString()
        }),
      });

      if (!extractResponse.ok) {
        throw new Error('Failed to extract text from PDF');
      }

      const extractData = await extractResponse.json();
      
      if (!extractData.success || !extractData.data.extractedText) {
        throw new Error('No text content extracted from PDF');
      }

      // Step 2: Generate video script
      const scriptResponse = await fetch('/api/pdftobrainrot/videoscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extractedText: extractData.data.extractedText,
        }),
      });

      if (!scriptResponse.ok) {
        throw new Error('Failed to generate video script');
      }

      const scriptData = await scriptResponse.json();
      console.log("scriptData from videoscript: ", scriptData.script);
      
      if (!scriptData.success || !scriptData.script) {
        throw new Error('Failed to generate script content');
      }


      // Step 3: Generate audio from script
      const audioResponse = await fetch('/api/pdftobrainrot/getaudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: String(scriptData.script),
          voiceId: selectedVoice,
        }),
      });

      if (!audioResponse.ok) {
        throw new Error('Failed to generate audio');
      }

      const audioData = await audioResponse.json();
      
      if (!audioData.audioUrl) {
        throw new Error('No audio URL generated');
      }
      // Step 4: Generate captions from audio
      const captionsResponse = await fetch('/api/pdftobrainrot/getcaptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl: audioData.audioUrl,
        }),
      });

      if (!captionsResponse.ok) {
        throw new Error('Failed to generate captions');
      }

      const captionsData = await captionsResponse.json();
      
      if (!captionsData.words || !captionsData.text) {
        throw new Error('No captions generated');
      }

      // Step 5: Save everything to the database
      const saveResponse = await fetch('/api/pdftobrainrot/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfUrl: pdfFile.cdnUrl,
          pdfName: pdfFile.name || 'Unnamed PDF',
          extractedText: extractData.data.extractedText,
          script: scriptData.script,
          audioUrl: audioData.audioUrl,
          captions: captionsData.words,
          voiceId: selectedVoice,
          status: 'completed'
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save data to database');
      }

      const savedData = await saveResponse.json();
      
      toast({
        title: "Success!",
        description: "Your PDF has been processed and saved successfully",
        variant: "default",
      });

      console.log('Generated Assets:', {
        script: scriptData.script,
        audioUrl: audioData.audioUrl,
        captions: captionsData.words,
        savedData
      });

    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        title: "Error",
        description: "Failed to process PDF: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">PDF to Brainrot</h1>
          <p className="text-muted-foreground">Upload a PDF file to process</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>
              Select a PDF file to begin processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadCareModal
              files={pdfFile}
              setFiles={setPdfFile}
              minFiles={1}
              maxFiles={1}
              acceptFileTypes="application/pdf"
              modalId="pdf-upload"
            />
            
            {pdfFile && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Selected PDF:</p>
                <div className="rounded-md overflow-hidden bg-muted p-2">
                  <p className="text-sm truncate">{pdfFile.name || "PDF file"}</p>
                </div>
              </div>
            )}

            <div className="mt-6">
              <VoiceSelector
                onVoiceSelect={handleVoiceSelect}
                selectedVoice={selectedVoice}
              />
            </div>
            
            <div className="pt-4 border-t mt-6">
              <Button 
                onClick={handleProcessPdf} 
                disabled={!pdfFile || !selectedVoice || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Generate Video"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
