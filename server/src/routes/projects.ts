import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth-guard.js";
import { mongo, contentCol, userCol } from "../db.js";
import { logger } from "../logger.js";
import { TIER_LIMITS, type Tier } from "../tiers.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

function col() {
  return mongo.db().collection("projects");
}

const CONTENT_FIELDS = ["pdfContent", "originalTranscript", "formattedTranscript"] as const;
type ContentField = (typeof CONTENT_FIELDS)[number];

const LIST_EXCLUDE = { pdfContent: 0, originalTranscript: 0, formattedTranscript: 0 };

// GET /api/projects — list all projects (summary, no large text blobs)
projectsRouter.get("/", async (req, res) => {
  const { userId } = req as AuthedRequest;
  const projects = await col()
    .find({ userId }, { projection: { _id: 0, ...LIST_EXCLUDE } })
    .sort({ updatedAt: -1 })
    .toArray();
  res.json(projects);
});

// GET /api/projects/:id — full project merged with content
projectsRouter.get("/:id", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const [project, content] = await Promise.all([
    col().findOne({ userId, id: req.params.id }, { projection: { _id: 0 } }),
    contentCol().findOne({ userId, projectId: req.params.id }, { projection: { _id: 0, userId: 0, projectId: 0, updatedAt: 0 } }),
  ]);
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...project, ...content });
});

// PUT /api/projects/:id — upsert (create or update)
projectsRouter.put("/:id", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const { id } = req.params;

  const {
    cardsSeenThisSession: _csts,
    sessionComplete: _sc,
    _id: _internal,
    ...projectData
  } = req.body;

  // Separate content fields from project metadata
  const contentData: Partial<Record<ContentField, string | null>> = {};
  for (const field of CONTENT_FIELDS) {
    if (field in projectData) {
      contentData[field] = projectData[field] as string | null;
      delete projectData[field];
    }
  }

  // Check if this is a new project and enforce tier limit
  const existing = await col().findOne({ userId, id }, { projection: { _id: 1 } });
  if (!existing) {
    const user = await userCol().findOne({ id: userId });
    const tier = ((user?.planTier as Tier) ?? "free");
    const limit = TIER_LIMITS[tier].projects;
    if (limit !== Infinity) {
      const count = await col().countDocuments({ userId });
      if (count >= limit) {
        res.status(403).json({ code: "PROJECT_LIMIT", limit });
        return;
      }
    }
  }

  const doc = { ...projectData, id, userId, updatedAt: new Date() };

  const ops: Promise<unknown>[] = [
    col().updateOne(
      { userId, id },
      { $set: doc, $setOnInsert: { createdAt: doc.createdAt ?? new Date() } },
      { upsert: true },
    ),
  ];

  if (Object.keys(contentData).length > 0) {
    ops.push(
      contentCol().updateOne(
        { userId, projectId: id },
        { $set: { ...contentData, userId, projectId: id, updatedAt: new Date() } },
        { upsert: true },
      ),
    );
  }

  await Promise.all(ops);

  logger.debug({ userId, projectId: id }, "project upserted");
  res.json({ ok: true });
});

// DELETE /api/projects/:id
projectsRouter.delete("/:id", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const [result] = await Promise.all([
    col().deleteOne({ userId, id: req.params.id }),
    contentCol().deleteOne({ userId, projectId: req.params.id }),
  ]);
  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  logger.debug({ userId, projectId: req.params.id }, "project deleted");
  res.json({ ok: true });
});

// POST /api/projects/batch — bulk upsert (used for local→server migration on first login)
projectsRouter.post("/batch", async (req, res) => {
  const { userId } = req as AuthedRequest;
  const projects: unknown[] = Array.isArray(req.body) ? req.body : [];
  if (projects.length === 0) {
    res.json({ ok: true, upserted: 0 });
    return;
  }

  const projectOps = [];
  const contentOps = [];

  for (const p of projects as any[]) {
    const { cardsSeenThisSession: _c, sessionComplete: _s, _id: _i, ...data } = p;
    const contentData: Partial<Record<ContentField, string | null>> = {};
    for (const field of CONTENT_FIELDS) {
      if (field in data) {
        contentData[field] = data[field] as string | null;
        delete data[field];
      }
    }
    projectOps.push({
      updateOne: {
        filter: { userId, id: data.id },
        update: {
          $set: { ...data, userId, updatedAt: new Date() },
          $setOnInsert: { createdAt: data.createdAt ?? new Date() },
        },
        upsert: true,
      },
    });
    if (Object.keys(contentData).length > 0) {
      contentOps.push({
        updateOne: {
          filter: { userId, projectId: data.id },
          update: { $set: { ...contentData, userId, projectId: data.id, updatedAt: new Date() } },
          upsert: true,
        },
      });
    }
  }

  const [result] = await Promise.all([
    col().bulkWrite(projectOps),
    contentOps.length > 0 ? contentCol().bulkWrite(contentOps) : Promise.resolve(null),
  ]);
  logger.info({ userId, upserted: result.upsertedCount + result.modifiedCount }, "batch upsert");
  res.json({ ok: true, upserted: result.upsertedCount + result.modifiedCount });
});
