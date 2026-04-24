import { ObjectId } from "mongodb";
import { jobsCol, contentCol } from "./db.js";
import { decryptApiKey } from "./crypto.js";
import { generateAll } from "./ai/generate.js";
import { logger } from "./logger.js";

const POLL_INTERVAL_MS = 5_000;

async function processNextJob(): Promise<void> {
  // Atomic: claim a pending job before any other worker process can
  const job = await jobsCol().findOneAndUpdate(
    { status: "pending" },
    { $set: { status: "running", startedAt: new Date() } },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  );

  if (!job) return;

  const jobId = (job._id as ObjectId).toString();
  logger.info({ jobId, projectId: job.projectId, providerId: job.providerId }, "worker: picked up job");

  let apiKey: string;
  try {
    apiKey = decryptApiKey(job.encryptedApiKey as string);
  } catch (err) {
    logger.error({ jobId, err }, "worker: failed to decrypt API key");
    await jobsCol().updateOne(
      { _id: job._id },
      { $set: { status: "failed", error: "Failed to decrypt API key", completedAt: new Date() }, $unset: { encryptedApiKey: "", pdfContent: "" } },
    );
    return;
  }

  try {
    const flags = job.flags as {
      generateStudyGuide: boolean;
      generateNotes: boolean;
      generateFlashcards: boolean;
      flashcardCount: number;
    };

    const result = await generateAll(
      job.pdfContent as string,
      job.providerId as string,
      job.modelId as string,
      apiKey,
      flags,
    );

    // Persist the generated content into projectContent so GET /api/projects/:id picks it up
    if (result.studyGuide || result.notes) {
      await contentCol().updateOne(
        { userId: job.userId, projectId: job.projectId },
        {
          $set: {
            ...(result.studyGuide ? { studyGuide: result.studyGuide } : {}),
            ...(result.notes ? { documentNotes: result.notes } : {}),
            updatedAt: new Date(),
          },
          $setOnInsert: { userId: job.userId, projectId: job.projectId },
        },
        { upsert: true },
      );
    }

    await jobsCol().updateOne(
      { _id: job._id },
      {
        $set: { status: "done", result, completedAt: new Date() },
        $unset: { encryptedApiKey: "", pdfContent: "" },
      },
    );

    logger.info({ jobId }, "worker: job completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ jobId, err }, "worker: job failed");
    await jobsCol().updateOne(
      { _id: job._id },
      {
        $set: { status: "failed", error: message, completedAt: new Date() },
        $unset: { encryptedApiKey: "", pdfContent: "" },
      },
    );
  }
}

export function startWorker(): void {
  const tick = () => {
    processNextJob().catch((err) => logger.error({ err }, "worker: unexpected error in tick"));
  };
  setInterval(tick, POLL_INTERVAL_MS);
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "background worker started");
}
