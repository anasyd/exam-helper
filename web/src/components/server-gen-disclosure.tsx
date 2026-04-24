"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface Props {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export function ServerGenDisclosure({ open, onAccept, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Background Generation
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground pt-2">
              <p>
                To continue generating after you close this tab, your API key
                will be sent to our server <strong>encrypted with RSA-OAEP</strong>.
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Used only for this generation job, then deleted immediately.</li>
                <li>Never logged or stored in plain text.</li>
                <li>Encrypted in your browser before transmission.</li>
              </ul>
              <p>
                You can close the tab once the job is submitted — results will
                be ready when you return.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onAccept}>
            I understand, proceed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
