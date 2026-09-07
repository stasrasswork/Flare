export type FlagType = "BOOLEAN" | "PERCENTAGE" | "STRING";
export type RuleType = "ALL" | "PERCENTAGE" | "USER_ALLOW" | "USER_DENY";
export type FlagValue = boolean | number | string;

export type User = {
  id: string;
  email: string;
  name: string;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

export type Environment = {
  id: string;
  key: string;
  name: string;
  sdkClientKey: string;
};

export type Workspace = WorkspaceSummary & {
  environments: Environment[];
};

export type Me = {
  user: User;
  workspaces: WorkspaceSummary[];
};

export type Rule = {
  id: string;
  type: RuleType;
  order: number;
  percentage: number | null;
  userIds: string[];
  value: FlagValue | null;
};

export type FlagState = {
  id: string;
  environmentId: string;
  enabled: boolean;
  defaultValue: FlagValue;
  version: number;
  rules: Rule[];
};

export type Flag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: FlagType;
  archivedAt: string | null;
  states: FlagState[];
};

export type RuleInput = {
  type: RuleType;
  percentage?: number;
  userIds?: string[];
  value?: FlagValue;
};

export type UpdateFlagStateInput = {
  enabled?: boolean;
  defaultValue?: FlagValue;
  rules?: RuleInput[];
};

export type CreateFlagInput = {
  key: string;
  name: string;
  description?: string;
  type: FlagType;
};

export type UpdateFlagInput = {
  name?: string;
  description?: string | null;
};
