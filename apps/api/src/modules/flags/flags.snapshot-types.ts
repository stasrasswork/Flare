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

    const snapshot = parsed as FlagSnapshot;
    if (typeof snapshot.version !== "number" || typeof snapshot.flags !== "object" || snapshot.flags === null) {
      return null;
    }

    return snapshot;
  } catch {
    return null;
  }
}
