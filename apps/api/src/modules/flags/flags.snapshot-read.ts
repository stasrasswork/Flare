import { redis } from "../../lib/redis.js";
import { parseSnapshot, snapshotKey, type FlagSnapshot } from "./flags.snapshot-types.js";

export async function getSnapshot(envId: string): Promise<FlagSnapshot | null> {
  const raw = await redis.get(snapshotKey(envId));
  if (!raw) {
    return null;
  }

  return parseSnapshot(raw);
}
