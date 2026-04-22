"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadCloud, Loader2, Video, X } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED_VIDEO_TYPES = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
  "video/quicktime": ".mov", // Often large, browser support varies
};

interface VideoUploadProps {
  onUploadAndTranscribe: (videoFile: File) => Promise<void>; // Parent handles actual upload and transcription
  isProcessingVideo: boolean;
}

export function VideoUpload({ onUploadAndTranscribe, isProcessingVideo }: VideoUploadProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (ACCEPTED_VIDEO_TYPES[selectedFile.type as keyof typeof ACCEPTED_VIDEO_TYPES]) {
        setVideoFile(selectedFile);
      } else {
        setVideoFile(null);
        setError(
          `Unsupported file type: ${selectedFile.name}. Please upload a valid video file (MP4, WebM, OGV, MOV).`
        );
      }
    } else {
      setVideoFile(null);
    }
  };

  const removeFile = () => {
    setVideoFile(null);
    setError(null);
    // Also reset the input field value so the same file can be selected again
    const input = document.getElementById("video-input") as HTMLInputElement;
    if (input) {
      input.value = "";
    }
  };

  const handleUpload = async () => {
    if (!videoFile) {
      setError("Please select a video file first.");
      return;
    }
    setError(null);
    await onUploadAndTranscribe(videoFile);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          id="video-input"
          type="file"
          accept={Object.values(ACCEPTED_VIDEO_TYPES).join(",")}
          onChange={handleFileChange}
          className="flex-1"
          disabled={isProcessingVideo || !!videoFile} // Disable if processing or file already selected
        />
        {videoFile && !isProcessingVideo && (
           <Button variant="ghost" size="icon" onClick={removeFile} className="h-9 w-9 p-0">
             <X className="h-5 w-5" />
           </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {videoFile && !isProcessingVideo && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium truncate">{videoFile.name}</span>
                </div>
                <span className="text-xs text-gray-500">
                    ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
            </div>
             <Button
                onClick={handleUpload}
                disabled={isProcessingVideo}
                className="w-full"
            >
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload & Start Transcription
            </Button>
        </div>
      )}

      {isProcessingVideo && (
        <div className="space-y-2 text-center p-4 border rounded-md">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            Processing video... This may take a while depending on the video size and length.
          </p>
          <Progress value={undefined} className="mt-2 h-2 animate-pulse" />
           <p className="text-xs text-muted-foreground mt-1">
            (Transcription is a complex task. Please be patient.)
          </p>
        </div>
      )}
    </div>
  );
}
