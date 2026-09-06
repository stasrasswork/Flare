import { z } from "zod";

export type SnapshotRuleType = "ALL" | "PERCENTAGE" | "USER_ALLOW" | "USER_DENY";
export type SnapshotFlagType = "BOOLEAN" | "PERCENTAGE" | "STRING";

export type SnapshotRule = {
  type: SnapshotRuleType;
  percentage?: number;
  userIds?: string[];
  value?: boolean | number | string;
};

export type SnapshotFlag = {
  type: SnapshotFlagType;
  enabled: boolean;
  defaultValue: boolean | number | string;
  rules: SnapshotRule[];
};

export type FlagSnapshot = {
  version: number;
  flags: Record<string, SnapshotFlag>;
};

const snapshotRuleSchema = z.object({
  type: z.enum(["ALL", "PERCENTAGE", "USER_ALLOW", "USER_DENY"]),
  percentage: z.number().int().min(0).max(100).optional(),
  userIds: z.array(z.string().min(1)).max(1000).optional(),
  value: z.union([z.boolean(), z.number(), z.string()]).optional(),
});

const snapshotFlagSchema = z.object({
  type: z.enum(["BOOLEAN", "PERCENTAGE", "STRING"]),
  enabled: z.boolean(),
  defaultValue: z.union([z.boolean(), z.number(), z.string()]),
  rules: z.array(snapshotRuleSchema).max(50),
});

const flagSnapshotSchema = z.object({
  version: z.number().int().nonnegative(),
  flags: z.record(z.string(), snapshotFlagSchema),
}).superRefine((snapshot, ctx) => {
  for (const [flagKey, flag] of Object.entries(snapshot.flags)) {
    const valueSchema = flag.type === "STRING" ? z.string() : z.boolean();
    if (!valueSchema.safeParse(flag.defaultValue).success) {
      ctx.addIssue({ code: "custom", path: ["flags", flagKey, "defaultValue"], message: "Invalid value type" });
    }
    flag.rules.forEach((rule, ruleIndex) => {
      if (rule.value !== undefined && !valueSchema.safeParse(rule.value).success) {
        ctx.addIssue({ code: "custom", path: ["flags", flagKey, "rules", ruleIndex, "value"], message: "Invalid value type" });
      }
    });
  }
});

export function snapshotKey(envId: string): string {
  return `flags:${envId}:snapshot`;
}

export const FLAG_CHANNEL_PREFIX = "flags:";
export const FLAG_CHANNEL_PATTERN = "flags:*";

export function snapshotChannel(envId: string): string {
  return `${FLAG_CHANNEL_PREFIX}${envId}`;
}

export function envIdFromChannel(channel: string): string | null {
  if (!channel.startsWith(FLAG_CHANNEL_PREFIX)) {
    return null;
  }

  const envId = channel.slice(FLAG_CHANNEL_PREFIX.length);
  if (!envId || envId.includes(":")) {
    return null;
  }

  return envId;
}

export function snapshotRevisionKey(envId: string): string {
  return `flags:${envId}:rev`;
}

export function parseSnapshot(raw: string): FlagSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const result = flagSnapshotSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }

    return result.data as FlagSnapshot;
  } catch {
    return null;
  }
}
