/**
 * Vitest global setup.
 *
 *  - Spins up an in-process MongoDB via mongodb-memory-server before all
 *    tests run, points MONGODB_URI at it, and tears it down after.
 *  - Resets the in-memory Redis mock between tests so OTP / reset-token
 *    state never leaks across cases.
 *  - Loads .env.local so adapters that look at env (Anthropic, MSG91…)
 *    behave the same way they do in dev.
 */
import { afterAll, afterEach, beforeAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { __resetMockRedis } from "@/server/db/redis";

let mongo: MongoMemoryServer | null = null;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  process.env.MONGODB_URI = uri;
  // Force a fresh connection — connectMongo() caches by URI.
  await mongoose.disconnect().catch(() => {});
  await mongoose.connect(uri);
});

afterEach(async () => {
  __resetMockRedis();
  // Wipe all collections between tests so each is isolated.
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  await mongo?.stop();
});
