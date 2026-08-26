import { invalidSdkKey, notFound } from "../../lib/errors.js";
import { resolveEnvironmentId } from "../../lib/sdk-index.js";
import { getSnapshot } from "../flags/flags.snapshot-read.js";
import { evaluate } from "./evaluate.js";
import type { EvaluateInput } from "./evaluate.schema.js";

export async function evaluateFlag(sdkKey: string, input: EvaluateInput) {
  const envId = await resolveEnvironmentId(sdkKey);
  if (!envId) {
    throw invalidSdkKey();
  }

  const snapshot = await getSnapshot(envId);
  if (!snapshot) {
    throw notFound("Snapshot not found");
  }

  const result = evaluate(snapshot, input.flagKey, input.context ?? {});
  return { ...result, version: snapshot.version };
}
