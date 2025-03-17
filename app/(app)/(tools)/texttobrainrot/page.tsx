"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronDown, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VoiceSelector from "../tik-tok-video-gen/components/VoiceSelector";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RemotionVideo } from "@/app/remotion/RemotionVideo";
import VideoSelector from "../pdftobrainrot/components/VideoSelector";
import VideoHistoryModal from "./components/VideoHistoryModal";
import { Textarea } from "@/components/ui/textarea";

// Define types for advanced options
type CaptionPreset = 'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS' | 'ALL';
type Alignment = 'top' | 'middle' | 'bottom';

// Constants for options
const CAPTION_PRESETS: { id: CaptionPreset; label: string }[] = [
  { id: 'BASIC', label: 'Basic' },
  { id: 'HORMOZI', label: 'Hormozi' },
  { id: 'WRAP 1', label: 'Wrap 1' },
  { id: 'WRAP 2', label: 'Wrap 2' },
  { id: 'FACELESS', label: 'Faceless' },
  { id: 'ALL', label: 'All' },
];

const ALIGNMENTS: { id: Alignment; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'middle', label: 'Middle' },
  { id: 'bottom', label: 'Bottom' },
];

export default function TextToBrainrotPage() {
  const [inputText, setInputText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Advanced options state
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
  const [selectedCaptionPreset, setSelectedCaptionPreset] = useState<CaptionPreset>('BASIC');
  const [selectedAlignment, setSelectedAlignment] = useState<Alignment>('bottom');
  const [disableCaptions, setDisableCaptions] = useState(false);

  // Video ready modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoData, setVideoData] = useState<{
    audioUrl: string;
    captions: Array<{text: string; start: number; end: number}>;
    duration: number;
  } | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
  };

  const handleProcessText = async () => {
    if (!inputText.trim()) {
      toast({
        title: "No text entered",
        description: "Please enter some text first",
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
    if(!selectedVideoUrl) {
      toast({
        title: "No video selected",
        description: "Please select a video first",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Step 2: Generate audio from script
      const audioResponse = await fetch('/api/texttobrainrot/getaudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: String(inputText),
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
      
      // Step 3: Generate captions from audio
      const captionsResponse = await fetch('/api/texttobrainrot/getcaptions', {
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

      // Step 4: Save everything to the database
      const requestBody = {
        inputText: inputText,
        textName: inputText.substring(0, 50) + (inputText.length > 50 ? '...' : ''),
        script: inputText,
        audioUrl: audioData.audioUrl,
        captions: captionsData.words,
        voiceId: selectedVoice,
        status: 'completed',
        disableCaptions: disableCaptions,
        screenRatio: '9/16',
        bgVideo: selectedVideoUrl,
        captionPreset: selectedCaptionPreset,
        captionAlignment: selectedAlignment,
      };
      
      const saveResponse = await fetch('/api/texttobrainrot/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save data to database');
      }

      const savedData = await saveResponse.json();
      
      // Set video data and show modal
      const videoDataToSet = {
        audioUrl: audioData.audioUrl,
        captions: captionsData.words,
        duration: audioData.duration || 0
      };
      console.log('Setting video data:', videoDataToSet, 'Selected video URL:', selectedVideoUrl);
      setVideoData(videoDataToSet);
      setShowVideoModal(true);

      toast({
        title: "Success!",
        description: "Your text has been processed and saved successfully",
        variant: "default",
      });

    } catch (error) {
      console.error('Error processing text:', error);
      toast({
        title: "Error",
        description: "Failed to process text: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Text to Video Generator</h1>
              <p className="text-muted-foreground">Enter text and generate a video with captions</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="mt-2 sm:mt-0 flex items-center gap-2"
              onClick={() => setIsHistoryModalOpen(true)}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enter script</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="input-text">Your script</Label>
                <Textarea 
                  id="input-text"
                  placeholder="Enter your script here..."
                  className="min-h-[150px]"
                  value={inputText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
                />
              </div>
              
              <div className="mt-6">
                <VoiceSelector
                  onVoiceSelect={handleVoiceSelect}
                  selectedVoice={selectedVoice}
                />
              </div>

              <div className="mt-6">
                <VideoSelector
                  onVideoSelect={setSelectedVideoUrl}
                  selectedVideoUrl={selectedVideoUrl}
                />
              </div>

              {/* Advanced Options Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
                  className="w-full flex justify-between items-center p-4 text-left"
                >
                  <h3 className="text-lg font-medium text-gray-800">Advanced options</h3>
                  <svg 
                    className={`w-5 h-5 transition-transform ${advancedOptionsOpen ? 'transform rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {advancedOptionsOpen && (
                  <div className="p-4 space-y-6 border-t border-gray-200">
                    {/* Disable Captions Toggle */}
                    <div className="py-2 border-t border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-medium text-gray-700">Disable Captions</h3>
                          <p className="text-sm text-gray-500">Do not show captions in your video</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={disableCaptions}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisableCaptions(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    {/* Caption Presets */}
                    <div className={`space-y-2 ${disableCaptions ? 'opacity-50 pointer-events-none' : ''}`}>
                      <label className="block text-sm font-medium text-gray-700">
                        Select a preset to add to your captions
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCaptionPreset('BASIC')}
                          disabled={disableCaptions}
                          className={`relative p-3 text-sm rounded-lg border transition-all ${
                            selectedCaptionPreset === 'BASIC'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-bold text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">BASIC</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCaptionPreset('HORMOZI')}
                          disabled={disableCaptions}
                          className={`relative p-3 text-sm rounded-lg border transition-all ${
                            selectedCaptionPreset === 'HORMOZI'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-bold text-lg text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">HORMOZI</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCaptionPreset('WRAP 1')}
                          disabled={disableCaptions}
                          className={`relative p-3 text-sm rounded-lg border transition-all ${
                            selectedCaptionPreset === 'WRAP 1'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-bold text-lg text-white bg-red-500 px-2 py-1 rounded">Wrap 1</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCaptionPreset('WRAP 2')}
                          disabled={disableCaptions}
                          className={`relative p-3 text-sm rounded-lg border transition-all ${
                            selectedCaptionPreset === 'WRAP 2'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-bold text-lg text-white bg-blue-500 px-2 py-1 rounded">WRAP 2</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCaptionPreset('FACELESS')}
                          disabled={disableCaptions}
                          className={`relative p-3 text-sm rounded-lg border transition-all ${
                            selectedCaptionPreset === 'FACELESS'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-bold text-lg text-gray-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">FACELESS</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCaptionPreset('ALL')}
                          disabled={disableCaptions}
                          className={`relative p-3 text-sm rounded-lg border transition-all ${
                            selectedCaptionPreset === 'ALL'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-bold text-lg">All</span>
                        </button>
                      </div>
                    </div>

                    {/* Caption Alignment */}
                    <div className={`space-y-2 ${disableCaptions ? 'opacity-50 pointer-events-none' : ''}`}>
                      <label className="block text-sm font-medium text-gray-700">
                        Alignment
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedAlignment('top')}
                          disabled={disableCaptions}
                          className={`flex items-center justify-center p-3 text-sm rounded-lg border transition-all ${
                            selectedAlignment === 'top'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 9h14M5 4h14" />
                          </svg>
                          Top
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedAlignment('middle')}
                          disabled={disableCaptions}
                          className={`flex items-center justify-center p-3 text-sm rounded-lg border transition-all ${
                            selectedAlignment === 'middle'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                          </svg>
                          Middle
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedAlignment('bottom')}
                          disabled={disableCaptions}
                          className={`flex items-center justify-center p-3 text-sm rounded-lg border transition-all ${
                            selectedAlignment === 'bottom'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 ring-opacity-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15h14M5 20h14" />
                          </svg>
                          Bottom
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t mt-6">
                <Button 
                  onClick={handleProcessText} 
                  disabled={!inputText.trim() || !selectedVoice || !selectedVideoUrl || isProcessing}
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

      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold text-center w-full">Your video is ready!</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
            {videoData ? (
              <div className="w-full flex items-center justify-center">
                <div className="relative w-full max-w-md mx-auto rounded-lg overflow-hidden" style={{ 
                  aspectRatio: "9/16",
                  height: "auto",
                  maxHeight: "calc(90vh - 120px)"
                }}>
                  {selectedVideoUrl ? (
                    <RemotionVideo
                      audioUrl={videoData.audioUrl}
                      duration={videoData.duration}
                      captions={videoData.captions || []}
                      captionPreset={selectedCaptionPreset}
                      captionAlignment={selectedAlignment}
                      screenRatio="9/16"
                      videoUrl={selectedVideoUrl}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full p-4 text-center">
                      <p className="text-muted-foreground">Video source not available. Please select a video and try again.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 w-full">
                <p className="text-muted-foreground">Loading video content...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video History Modal */}
      <VideoHistoryModal 
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </>
  );
}
