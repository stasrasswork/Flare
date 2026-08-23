import { flagBucket } from "../../lib/hash.js";
import type { FlagSnapshot, SnapshotFlag, SnapshotFlagType, SnapshotRule } from "../flags/flags.snapshot-types.js";

export type EvalContext = {
  userId?: string;
};

export type EvalReason =
  | "NOT_FOUND"
  | "DISABLED"
  | "USER_DENY"
  | "USER_ALLOW"
  | "PERCENTAGE"
  | "ALL"
  | "DEFAULT";

export type EvalResult = {
  value: boolean | number | string;
  reason: EvalReason;
};

export function offValue(type: SnapshotFlagType): boolean | string {
  return type === "STRING" ? "" : false;
}

function matchedValue(flag: SnapshotFlag, rule: SnapshotRule): boolean | number | string {
  if (rule.value !== undefined) {
    return rule.value;
  }
  return flag.type === "STRING" ? flag.defaultValue : true;
}

export function evaluate(
  snapshot: FlagSnapshot,
  flagKey: string,
  context: EvalContext = {},
): EvalResult {
  const flag = snapshot.flags[flagKey];
  if (!flag) {
    return { value: false, reason: "NOT_FOUND" };
  }

  if (!flag.enabled) {
    return { value: offValue(flag.type), reason: "DISABLED" };
  }

  for (const rule of flag.rules) {
    if (rule.type === "USER_DENY") {
      if (context.userId && rule.userIds?.includes(context.userId)) {
        return { value: offValue(flag.type), reason: "USER_DENY" };
      }
      continue;
    }

    if (rule.type === "USER_ALLOW") {
      if (context.userId && rule.userIds?.includes(context.userId)) {
        return { value: matchedValue(flag, rule), reason: "USER_ALLOW" };
      }
      continue;
    }

    if (rule.type === "PERCENTAGE") {
      if (
        context.userId &&
        rule.percentage !== undefined &&
        flagBucket(flagKey, context.userId) < rule.percentage
      ) {
        return { value: matchedValue(flag, rule), reason: "PERCENTAGE" };
      }
      continue;
    }

    if (rule.type === "ALL") {
      return { value: matchedValue(flag, rule), reason: "ALL" };
    }
  }

  return { value: flag.defaultValue, reason: "DEFAULT" };
}
