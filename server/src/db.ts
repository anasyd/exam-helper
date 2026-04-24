import { MongoClient, GridFSBucket } from "mongodb";
import { config } from "./config.js";
import { logger } from "./logger.js";

export const mongo = new MongoClient(config.MONGODB_URI);

export async function connectDb(): Promise<void> {
  await mongo.connect();
  await mongo.db().command({ ping: 1 });
  await mongo.db().collection("projects").createIndex(
    { userId: 1, id: 1 },
    { unique: true, background: true },
  );
  await mongo.db().collection("projectContent").createIndex(
    { userId: 1, projectId: 1 },
    { unique: true, background: true },
  );
  logger.info(
    { uri: config.MONGODB_URI.replace(/\/\/[^@]+@/, "//***@") },
    "mongo connected",
  );
}

export async function disconnectDb(): Promise<void> {
  await mongo.close();
  logger.info("mongo disconnected");
}

export function filesBucket(): GridFSBucket {
  return new GridFSBucket(mongo.db(), { bucketName: "files" });
}

export function contentCol() {
  return mongo.db().collection("projectContent");
}

export function userCol() {
  return mongo.db().collection<{ id: string; email: string; name: string; planTier?: string; planExpiresAt?: number | null; emailVerified?: boolean; createdAt?: Date; updatedAt?: Date }>("user");
}
