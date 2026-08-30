export { Flare } from "./client.js";
export { evaluate } from "./evaluate.js";
export { FlareAuthError, FlareError, FlareTimeoutError } from "./errors.js";
export { flagBucket } from "./hash.js";

export type { EvalReason, EvalResult } from "./evaluate.js";
export type {
  EvalContext,
  FlagSnapshot,
  FlagValue,
  FlareEvents,
  FlareOptions,
  SnapshotFlag,
  SnapshotFlagType,
  SnapshotRule,
  SnapshotRuleType,
} from "./types.js";
