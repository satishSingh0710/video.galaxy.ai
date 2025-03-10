"use client"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {Player} from '@remotion/player';
import { RemotionVideo } from "./RemotionVideo";
import { useEffect, useState } from "react";

export default function PlayerDialogue({playVideo, videoId}: any) {

    const [openDialog, setOpenDialog] = useState(false);
    useEffect(() => {
        if (playVideo) {
            setOpenDialog(playVideo);
        }
    }, [playVideo]);
    return (
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogContent className="bg-white flex flex-col items-center justify-center">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold my-4">Your video is ready!</DialogTitle>
          <DialogDescription>
            <Player
              component={RemotionVideo}
              durationInFrames={120}
              fps={30}
              compositionWidth={300}
              compositionHeight={450}
            />
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
    );
}