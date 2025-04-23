"use client";

import { useState, useEffect } from "react";
import { useFlashcardStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Settings, Save, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";

export function AppSettings() {
  const { geminiApiKey, setGeminiApiKey } = useFlashcardStore();
  const [apiKey, setApiKey] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (geminiApiKey) {
      setApiKey(geminiApiKey);
    }
  }, [geminiApiKey]);

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKey);
    setIsSaved(true);
    toast.success("API key saved successfully", {
      description: "Your Gemini API key has been saved for future use.",
    });

    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  const handleClearApiKey = () => {
    setApiKey("");
    setGeminiApiKey(null);
    toast.info("API key removed", {
      description: "Your Gemini API key has been cleared.",
    });
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>
            Configure global settings for the flashcard application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key" className="font-medium">
              Gemini API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              This API key will be stored locally in your browser and used for
              all flashcard generation.
            </p>

            <div className="text-xs text-muted-foreground space-y-2 mt-4 p-3 border rounded-md bg-muted/30">
              <p className="font-medium">How to get your API key:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Visit{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 inline-flex items-center"
                  >
                    Google AI Studio <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </li>
                <li>Create or sign in to your Google account</li>
                <li>Go to the API Keys section</li>
                <li>Create a new API key and copy it</li>
              </ol>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClearApiKey}
            disabled={!apiKey}
          >
            Clear API Key
          </Button>

          <Button onClick={handleSaveApiKey} disabled={!apiKey || isSaved}>
            {isSaved ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save API Key
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
