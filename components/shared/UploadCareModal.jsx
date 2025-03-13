import { FileUploaderRegular } from "@uploadcare/react-uploader/next";
import "@uploadcare/react-uploader/core.css";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { LucideUpload } from "lucide-react";
import { Card } from "@/components/ui/card";

function UploadCareModal({
  files,
  minFiles,
  maxFiles,
  setFiles,
  acceptFileTypes,
  modalId = "default", // Add modalId prop to distinguish between different instances
  onUpload = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const uploaderRef = useRef(null);
  const [currentFiles, setCurrentFiles] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && uploaderRef.current) {
      setTimeout(() => {
        const api = uploaderRef.current.getAPI();
        api.initFlow();
      }, 100);
    }
  }, [isOpen, uploaderRef]);

  const handleChangeEvent = (uploadedFiles) => {
    if (!isOpen) return; // Only process if this modal instance is open

    if (files?.length + uploadedFiles.allEntries.length > maxFiles && maxFiles!==1) {
      toast({
        title: "You have reached the maximum number of files",
        description: "Please remove any selected files before uploading more",
        variant: "destructive",
      });

      return;
    }

    const successFiles = uploadedFiles.allEntries.filter(
      (f) => f.status === "success"
    );
    setCurrentFiles([...successFiles]);
  };

  const handleCloseEvent = () => {
    console.log("handleCloseEvent", isOpen);
    if (!isOpen) return; // Only process if this modal instance is open

    if (Array.isArray(files)) {
      const totalFiles = [...files, ...currentFiles];

      if (totalFiles.length > maxFiles && maxFiles!==1) {
        toast({
          title: `You can upload a maximum of ${maxFiles} files`,
          description: `Truncating the number of files to the maximum`,
          variant: "destructive",
        });
      }
      const slicedFiles = totalFiles.slice(-maxFiles);
      setFiles(slicedFiles);

      if (onUpload) {
        onUpload(slicedFiles);
      }
    } else {
      setFiles(currentFiles[0]);
      if (onUpload) {
        onUpload(currentFiles);
      }
    }

    setCurrentFiles([]);
    const api = uploaderRef.current.getAPI();
    api.removeAllFiles();
    setIsOpen(false);
  };

  return (
    <div> 
      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <style jsx global>{`
            /* Style the Uploadcare button to match ImageUploader */
            uc-simple-btn {
              width: 100% !important;
            }

            uc-simple-btn button {
              width: 100% !important;
              border: 2px dashed #e5e7eb !important;
              border-radius: 0.5rem !important;
              padding: 1.5rem 1rem !important;
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 0.75rem !important;
              background: transparent !important;
              transition: all 0.2s !important;
              min-height: unset !important;
              cursor: pointer !important;
            }

            uc-simple-btn button:hover {
              border-color: hsl(var(--primary)) !important;
            }

            uc-simple-btn button uc-icon {
              width: 2rem !important;
              height: 2rem !important;
              margin: 0 !important;
              color: hsl(var(--muted-foreground)) !important;
            }

            uc-simple-btn button uc-icon svg {
              width: 2rem !important;
              height: 2rem !important;
              stroke: currentColor !important;
              stroke-width: 2 !important;
              fill: none !important;
            }

            uc-simple-btn button > div {
              display: flex !important;
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 0.25rem !important;
            }

            uc-simple-btn button span {
              color: hsl(var(--muted-foreground)) !important;
              font-size: 0.875rem !important;
              margin: 0 !important;
            }

            uc-simple-btn button span::after {
              content: "Browse Files";
              display: block;
              color: hsl(var(--primary));
              text-decoration: underline;
              font-size: 0.875rem;
              margin-top: 0.25rem;
            }

            /* Style the drop area */
            .uc-visual-drop-area {
              display: none !important;
            }

            /* Modal styles */
            uc-modal dialog {
              border-radius: 0.75rem !important;
              border: 1px solid hsl(var(--border)) !important;
              background: hsl(var(--background)) !important;
              color: hsl(var(--foreground)) !important;
            }

            uc-activity-header {
              background: hsl(var(--background)) !important;
              border-bottom: 1px solid hsl(var(--border)) !important;
            }

            .uc-toolbar {
              background: hsl(var(--background)) !important;
              border-top: 1px solid hsl(var(--border)) !important;
            }

            uc-copyright {
              display: none !important;
            }
          `}</style>
          <FileUploaderRegular
            multiple={true}
            multipleMin={
              minFiles - files?.length > 0 ? minFiles - files?.length : 1
            }
            multipleMax={
              maxFiles - files?.length > 0 ? maxFiles - files?.length : 1
            }
            maxLocalFileSizeBytes={acceptFileTypes==="image/*" ? 10*1024*1024 : 300*1024*1024}
            multipartMaxAttempts={5}
            onModalOpen={() => setIsOpen(true)}
            apiRef={uploaderRef}
            onChange={handleChangeEvent}
            ctxName={modalId}
            sourceList="local, url, camera, dropbox, facebook, gdrive, gphotos"
            classNameUploader="uc-light"
            pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY}
            accept={acceptFileTypes}
            onModalClose={handleCloseEvent}
            className="w-full"
            
          />
        </div>
      </Card>
    </div>
  );
}

export default UploadCareModal;

export function useImageDimensions(firstImageUrl, secondImageUrl) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 1067 }); // Default 3:4 ratio

  useEffect(() => {
    if (!firstImageUrl || !secondImageUrl) return;

    const loadImage = (url) => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = url;
      });
    };

    Promise.all([loadImage(firstImageUrl), loadImage(secondImageUrl)]).then(
      ([firstDim, secondDim]) => {
        // Calculate aspect ratios
        const firstRatio = firstDim.width / firstDim.height;
        const secondRatio = secondDim.width / secondDim.height;

        // Use the smaller image's dimensions as reference
        const useFirstAsRef =
          firstDim.width * firstDim.height < secondDim.width * secondDim.height;

        setDimensions(useFirstAsRef ? firstDim : secondDim);
      }
    );
  }, [firstImageUrl, secondImageUrl]);

  return dimensions;
}