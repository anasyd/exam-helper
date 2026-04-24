import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth, type AuthedRequest } from "../middleware/auth-guard.js";
import { jobsCol } from "../db.js";
import { getPublicKeyPem } from "../crypto.js";

export const jobsRouter = Router();

// GET /api/pubkey — RSA public key for client-side encryption
jobsRouter.get("/pubkey", (_req, res) => {
  try {
    res.json({ publicKey: getPublicKeyPem() });
  } catch {
    res.status(503).json({ error: "Keys not ready" });
  }
});

jobsRouter.use(requireAuth);

// POST /api/jobs — submit a background generation job
jobsRouter.post("/", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const { projectId, providerId, modelId, encryptedApiKey, pdfContent, flags } = req.body as {
    projectId: string;
    providerId: string;
    modelId: string;
    encryptedApiKey: string;
    pdfContent: string;
    flags: {
      generateStudyGuide: boolean;
      generateNotes: boolean;
      generateFlashcards: boolean;
      flashcardCount: number;
    };
  };

  if (!projectId || !providerId || !modelId || !encryptedApiKey || !pdfContent || !flags) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const validProviders = ["gemini", "openai", "anthropic", "openrouter"];
  if (!validProviders.includes(providerId)) {
    res.status(400).json({ error: "Invalid providerId" });
    return;
  }

  const job = {
    userId,
    projectId,
    status: "pending" as const,
    providerId,
    modelId,
    encryptedApiKey,
    pdfContent,
    flags,
    createdAt: new Date(),
  };

  const result = await jobsCol().insertOne(job);
  res.status(201).json({ jobId: result.insertedId.toString() });
});

// GET /api/jobs/:id — poll a single job
jobsRouter.get("/:id", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;

  let id: ObjectId;
  try {
    id = new ObjectId(req.params.id);
  } catch {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }

  const job = await jobsCol().findOne({ _id: id, userId });
  if (!job) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Never return the encrypted key or raw text to the client
  const { encryptedApiKey: _key, pdfContent: _text, ...safe } = job as typeof job & {
    encryptedApiKey?: string;
    pdfContent?: string;
  };
  void _key; void _text;
  res.json({ ...safe, id: job._id.toString() });
});

// GET /api/jobs/project/:projectId — all jobs for a project
jobsRouter.get("/project/:projectId", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const jobs = await jobsCol()
    .find({ userId, projectId: req.params.projectId })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  const safe = jobs.map((j) => {
    const { encryptedApiKey: _k, pdfContent: _t, ...rest } = j as typeof j & {
      encryptedApiKey?: string;
      pdfContent?: string;
    };
    void _k; void _t;
    return { ...rest, id: j._id.toString() };
  });
  res.json(safe);
});
