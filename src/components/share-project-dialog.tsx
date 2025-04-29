"use client";

import { useState, useEffect } from "react";
import { useFlashcardStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Share2,
  Copy,
  Check,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ShareProjectDialogProps {
  projectId: string;
}

export function ShareProjectDialog({ projectId }: ShareProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { createShareableLink } = useFlashcardStore();

  // Generate the share link when the dialog is opened
  useEffect(() => {
    if (isOpen && !shareLink) {
      const link = createShareableLink(projectId);
      setShareLink(link);
    }
  }, [isOpen, projectId, createShareableLink, shareLink]);

  // Reset copied state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");

      // Reset the copied status after a delay
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(
        "Failed to copy link. Please try manually selecting and copying."
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Create a link that allows others to copy your project and
            flashcards.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <LinkIcon className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm text-blue-700">
              Anyone with this link can copy this project and its flashcards,
              but they cannot modify your original project.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Input
                value={shareLink || "Generating link..."}
                readOnly
                className="h-9"
              />
            </div>
            <Button
              size="sm"
              className="px-3"
              onClick={handleCopyLink}
              disabled={!shareLink || copied}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy</span>
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>To use this link:</p>
            <ol className="list-decimal ml-5 mt-2 space-y-1">
              <li>Share the link with others</li>
              <li>
                When they open the link, they'll be able to import your
                flashcards
              </li>
              <li>
                The copy they create will be independent from your original
              </li>
            </ol>
          </div>
        </div>

        <DialogFooter className="sm:justify-start">
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
