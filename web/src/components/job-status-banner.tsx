"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pollJob, type Job } from "@/lib/api/jobs";

interface Props {
  jobId: string;
  onComplete: (job: Job) => void;
  onDismiss: () => void;
}

export function JobStatusBanner({ jobId, onComplete, onDismiss }: Props) {
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const poll = async () => {
      try {
        const j = await pollJob(jobId);
        if (stopped) return;
        setJob(j);
        if (j.status === "done" || j.status === "failed") {
          if (interval) clearInterval(interval);
          if (j.status === "done") onComplete(j);
        }
      } catch {
        // network error — keep polling
      }
    };

    void poll();
    interval = setInterval(poll, 5_000);
    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
    };
  }, [jobId, onComplete]);

  if (!job) return null;

  const isPending = job.status === "pending";
  const isRunning = job.status === "running";
  const isDone = job.status === "done";
  const isFailed = job.status === "failed";

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
      isFailed ? "border-destructive/50 bg-destructive/10" : "border-border bg-muted/50"
    }`}>
      {(isPending || isRunning) && (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      )}
      {isDone && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />}
      {isFailed && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}

      <span className="flex-1">
        {isPending && "Waiting to start background generation…"}
        {isRunning && "Generating study content in background…"}
        {isDone && "Background generation complete! Content applied."}
        {isFailed && `Generation failed: ${job.error ?? "Unknown error"}`}
      </span>

      {(isDone || isFailed) && (
        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
