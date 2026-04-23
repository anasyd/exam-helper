import { MongoClient } from "mongodb";
import { config } from "./config.js";
import { logger } from "./logger.js";

export const mongo = new MongoClient(config.MONGODB_URI);

export async function connectDb(): Promise<void> {
  await mongo.connect();
  await mongo.db().command({ ping: 1 });
  // Ensure compound index for per-user project lookups
  await mongo.db().collection("projects").createIndex(
    { userId: 1, id: 1 },
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
