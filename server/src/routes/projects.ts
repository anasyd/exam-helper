import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth-guard.js";
import { mongo } from "../db.js";
import { logger } from "../logger.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

function col() {
  return mongo.db().collection("projects");
}

// Fields excluded from list responses to keep payloads small
const LIST_EXCLUDE = {
  pdfContent: 0,
  originalTranscript: 0,
  formattedTranscript: 0,
};

// GET /api/projects — list all projects (summary, no large text blobs)
projectsRouter.get("/", async (req, res) => {
  const { userId } = req as AuthedRequest;
  const projects = await col()
    .find({ userId }, { projection: { _id: 0, ...LIST_EXCLUDE } })
    .sort({ updatedAt: -1 })
    .toArray();
  res.json(projects);
});

// GET /api/projects/:id — full project including content
projectsRouter.get("/:id", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const project = await col().findOne(
    { userId, id: req.params.id },
    { projection: { _id: 0 } },
  );
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(project);
});

// PUT /api/projects/:id — upsert (create or update)
projectsRouter.put("/:id", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const { id } = req.params;

  // Strip ephemeral fields and internal fields before saving
  const {
    cardsSeenThisSession: _csts,
    sessionComplete: _sc,
    _id: _internal,
    ...projectData
  } = req.body;

  const doc = {
    ...projectData,
    id,
    userId,
    updatedAt: new Date(),
  };

  await col().updateOne(
    { userId, id },
    { $set: doc, $setOnInsert: { createdAt: doc.createdAt ?? new Date() } },
    { upsert: true },
  );

  logger.debug({ userId, projectId: id }, "project upserted");
  res.json({ ok: true });
});

// DELETE /api/projects/:id
projectsRouter.delete("/:id", async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const result = await col().deleteOne({ userId, id: req.params.id });
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

  const ops = projects.map((p: any) => {
    const { cardsSeenThisSession: _c, sessionComplete: _s, _id: _i, ...data } = p;
    return {
      updateOne: {
        filter: { userId, id: data.id },
        update: {
          $set: { ...data, userId, updatedAt: new Date() },
          $setOnInsert: { createdAt: data.createdAt ?? new Date() },
        },
        upsert: true,
      },
    };
  });

  const result = await col().bulkWrite(ops);
  logger.info({ userId, upserted: result.upsertedCount + result.modifiedCount }, "batch upsert");
  res.json({ ok: true, upserted: result.upsertedCount + result.modifiedCount });
});
