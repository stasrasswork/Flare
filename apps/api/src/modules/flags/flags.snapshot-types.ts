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

export function snapshotChannel(envId: string): string {
  return `flags:${envId}`;
}

export function snapshotRevisionKey(envId: string): string {
  return `flags:${envId}:rev`;
}
