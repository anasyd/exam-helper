import { MongoClient, GridFSBucket } from "mongodb";
import { config } from "./config.js";
import { logger } from "./logger.js";

export const mongo = new MongoClient(config.MONGODB_URI);

// Parse the DB name from the URI path; fall back to "examhelper".
// Without this, db() defaults to "test" when no DB is in the URI.
const DB_NAME = (() => {
  try {
    const path = new URL(config.MONGODB_URI.replace(/^mongodb(\+srv)?/, "https")).pathname;
    return path.slice(1).split("?")[0] || "examhelper";
  } catch {
    return "examhelper";
  }
})();

export const db = () => mongo.db(DB_NAME);

export async function connectDb(): Promise<void> {
  await mongo.connect();
  await db().command({ ping: 1 });
  await db().collection("projects").createIndex(
    { userId: 1, id: 1 },
    { unique: true, background: true },
  );
  await db().collection("projectContent").createIndex(
    { userId: 1, projectId: 1 },
    { unique: true, background: true },
  );
  logger.info(
    { uri: config.MONGODB_URI.replace(/\/\/[^@]+@/, "//***@"), db: DB_NAME },
    "mongo connected",
  );
}

export async function disconnectDb(): Promise<void> {
  await mongo.close();
  logger.info("mongo disconnected");
}

export function filesBucket(): GridFSBucket {
  return new GridFSBucket(db(), { bucketName: "files" });
}

export function contentCol() {
  return db().collection("projectContent");
}

export function userCol() {
  return db().collection<{ id: string; email: string; name: string; planTier?: string; planExpiresAt?: number | null; emailVerified?: boolean; createdAt?: Date; updatedAt?: Date }>("user");
}
