import { invalidSdkKey, notFound } from "../../lib/errors.js";
import { redis } from "../../lib/redis.js";
import { sdkIndexKey } from "../../lib/sdk-index.js";
import { snapshotKey, type FlagSnapshot } from "../flags/flags.snapshot-types.js";
import { evaluate } from "./evaluate.js";
import type { EvaluateInput } from "./evaluate.schema.js";

function parseSnapshot(raw: string): FlagSnapshot {
  try {
    return JSON.parse(raw) as FlagSnapshot;
  } catch {
    throw notFound("Snapshot not found");
  }
}

export async function evaluateFlag(sdkKey: string, input: EvaluateInput) {
  const envId = await redis.get(sdkIndexKey(sdkKey));
  if (!envId) {
    throw invalidSdkKey();
  }

  const raw = await redis.get(snapshotKey(envId));
  if (!raw) {
    throw notFound("Snapshot not found");
  }

  const snapshot = parseSnapshot(raw);
  const result = evaluate(snapshot, input.flagKey, input.context ?? {});
  return { ...result, version: snapshot.version };
}
