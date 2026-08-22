import type { FlagType, Prisma, RuleType } from "../../generated/prisma/client.js";

export type RuleDto = {
  id: string;
  type: RuleType;
  order: number;
  percentage: number | null;
  userIds: string[];
  value: boolean | number | string | null;
};

export type FlagStateDto = {
  id: string;
  environmentId: string;
  enabled: boolean;
  defaultValue: boolean | number | string;
  version: number;
  rules: RuleDto[];
};

export type FlagDto = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: FlagType;
  archivedAt: string | null;
  states: FlagStateDto[];
};

export function toFlagValue(value: Prisma.JsonValue | null | undefined): boolean | number | string | null {
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value;
  }
  return null;
}

function toRequiredFlagValue(value: Prisma.JsonValue): boolean | number | string {
  return toFlagValue(value) ?? false;
}

export function toRuleDto(rule: {
  id: string;
  type: RuleType;
  order: number;
  percentage: number | null;
  userIds: string[];
  value: Prisma.JsonValue | null;
}): RuleDto {
  return {
    id: rule.id,
    type: rule.type,
    order: rule.order,
    percentage: rule.percentage,
    userIds: rule.userIds,
    value: toFlagValue(rule.value),
  };
}

export function toFlagStateDto(state: {
  id: string;
  environmentId: string;
  enabled: boolean;
  defaultValue: Prisma.JsonValue;
  version: number;
  rules: Array<{
    id: string;
    type: RuleType;
    order: number;
    percentage: number | null;
    userIds: string[];
    value: Prisma.JsonValue | null;
  }>;
}): FlagStateDto {
  return {
    id: state.id,
    environmentId: state.environmentId,
    enabled: state.enabled,
    defaultValue: toRequiredFlagValue(state.defaultValue),
    version: state.version,
    rules: [...state.rules].sort((a, b) => a.order - b.order).map(toRuleDto),
  };
}

export function toFlagDto(flag: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: FlagType;
  archivedAt: Date | null;
  states: Array<Parameters<typeof toFlagStateDto>[0]>;
}): FlagDto {
  return {
    id: flag.id,
    key: flag.key,
    name: flag.name,
    description: flag.description,
    type: flag.type,
    archivedAt: flag.archivedAt?.toISOString() ?? null,
    states: flag.states.map(toFlagStateDto),
  };
}
