import { redis } from "../../lib/redis.js";

export const PRESENCE_TTL_MS = 30_000;

export function presenceKey(envId: string): string {
  return `presence:${envId}`;
}

export async function presenceAdd(envId: string, connId: string): Promise<void> {
  await redis.zadd(presenceKey(envId), Date.now() + PRESENCE_TTL_MS, connId);
}

export async function presenceRemove(envId: string, connId: string): Promise<void> {
  await redis.zrem(presenceKey(envId), connId);
}

export async function presenceCount(envId: string): Promise<number> {
  const key = presenceKey(envId);
  await redis.zremrangebyscore(key, "-inf", Date.now());
  return redis.zcard(key);
}
