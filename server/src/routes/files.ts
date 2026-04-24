import { Router } from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import { requireAuth, type AuthedRequest } from "../middleware/auth-guard.js";
import { filesBucket, userCol } from "../db.js";
import { logger } from "../logger.js";
import { TIER_LIMITS, type Tier } from "../tiers.js";

export const filesRouter = Router();
filesRouter.use(requireAuth);

// Max multer limit is the largest allowed tier (pro: 50 MB); per-tier checks happen in handler
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// POST /api/files/upload — store one file in GridFS, return its ID
filesRouter.post("/upload", upload.single("file"), async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const projectId = req.body?.projectId as string | undefined;

  // Resolve tier limits
  const user = await userCol().findOne({ id: userId });
  const tier = ((user?.planTier as Tier) ?? "free");
  const limits = TIER_LIMITS[tier];

  // Size check
  const maxBytes = limits.maxFileSizeMb * 1024 * 1024;
  if (req.file.size > maxBytes) {
    res.status(413).json({ code: "FILE_TOO_LARGE", limitMb: limits.maxFileSizeMb });
    return;
  }

  // Per-project PDF count check (only for PDFs associated with a project)
  if (projectId && req.file.mimetype === "application/pdf") {
    const bucket = filesBucket();
    const existingFiles = await bucket
      .find({ "metadata.userId": userId, "metadata.projectId": projectId })
      .toArray();
    if (existingFiles.length >= limits.pdfsPerProject) {
      res.status(403).json({ code: "PDF_LIMIT", limit: limits.pdfsPerProject });
      return;
    }
  }

  const bucket = filesBucket();
  const uploadStream = bucket.openUploadStream(req.file.originalname, {
    metadata: { userId, projectId: projectId ?? null, contentType: req.file.mimetype },
  });

  uploadStream.end(req.file.buffer);

  uploadStream.once("finish", () => {
    const fileId = uploadStream.id.toString();
    logger.debug({ userId, fileId, name: req.file!.originalname }, "file uploaded");
    res.json({ fileId, fileName: req.file!.originalname });
  });

  uploadStream.once("error", (err) => {
    logger.error({ err }, "gridfs upload error");
    res.status(500).json({ error: "Upload failed" });
  });
});

// GET /api/files/:id — stream a file back to the client
filesRouter.get("/:id", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;

  let id: ObjectId;
  try {
    id = new ObjectId(req.params.id);
  } catch {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  const bucket = filesBucket();
  const files = await bucket
    .find({ _id: id, "metadata.userId": userId })
    .toArray();

  if (files.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const file = files[0]!;
  res.setHeader("Content-Type", (file.metadata?.contentType as string) ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.filename)}"`);

  bucket.openDownloadStream(id).pipe(res);
});

// DELETE /api/files/:id — remove a stored file
filesRouter.delete("/:id", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;

  let id: ObjectId;
  try {
    id = new ObjectId(req.params.id);
  } catch {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  const bucket = filesBucket();
  const files = await bucket
    .find({ _id: id, "metadata.userId": userId })
    .toArray();

  if (files.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await bucket.delete(id);
  logger.debug({ userId, fileId: req.params.id }, "file deleted");
  res.json({ ok: true });
});
