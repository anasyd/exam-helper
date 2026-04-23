import { Router } from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import { requireAuth, type AuthedRequest } from "../middleware/auth-guard.js";
import { filesBucket } from "../db.js";
import { logger } from "../logger.js";

export const filesRouter = Router();
filesRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
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

  const bucket = filesBucket();
  const uploadStream = bucket.openUploadStream(req.file.originalname, {
    metadata: { userId, contentType: req.file.mimetype },
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
  res.setHeader(
    "Content-Type",
    (file.metadata?.contentType as string) ?? "application/octet-stream",
  );
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(file.filename)}"`,
  );

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
