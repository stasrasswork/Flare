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

export const redisSub = redis.duplicate();

redisSub.on("error", (err: Error & { code?: string }) => {
  console.error("Redis subscriber error:", err.code ?? err.message);
});

export function waitUntilReady(client: Redis, timeoutMs = 10_000): Promise<void> {
  if (client.status === "ready") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Redis client did not become ready"));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      client.off("ready", onReady);
      client.off("error", onError);
    };

    client.once("ready", onReady);
    client.once("error", onError);

    if (client.status === "ready") {
      onReady();
    }
  });
}
