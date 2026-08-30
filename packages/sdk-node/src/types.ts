export type SnapshotRuleType = "ALL" | "PERCENTAGE" | "USER_ALLOW" | "USER_DENY";
export type SnapshotFlagType = "BOOLEAN" | "PERCENTAGE" | "STRING";
export type FlagValue = boolean | number | string;

export type SnapshotRule = {
  type: SnapshotRuleType;
  percentage?: number;
  userIds?: string[];
  value?: FlagValue;
};

export type SnapshotFlag = {
  type: SnapshotFlagType;
  enabled: boolean;
  defaultValue: FlagValue;
  rules: SnapshotRule[];
};

export type FlagSnapshot = {
  version: number;
  flags: Record<string, SnapshotFlag>;
};

export type EvalContext = {
  userId?: string;
};

export type FlareOptions = {
  sdkKey: string;
  url: string;
  timeoutMs?: number;
};

export type FlareEvents = {
  ready: { version: number };
  update: { version: number };
  disconnect: { code?: number };
  reconnect: { attempt: number };
  error: { error: Error };
};

export const DEFAULT_TIMEOUT_MS = 10_000;
