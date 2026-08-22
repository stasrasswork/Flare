import { Redis } from "ioredis";
import { config } from "../config.js";

function createRedis() {
  const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    retryStrategy(times) {
      return Math.min(times * 200, 5000);
    },
  });

  client.on("error", (err: Error & { code?: string }) => {
    console.error("Redis error:", err.code ?? err.message);
  });

  return client;
}

export const redis = createRedis();
export const redisSubscriber = createRedis();
