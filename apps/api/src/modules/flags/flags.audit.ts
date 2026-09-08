import type { Prisma, RuleType } from "../../generated/prisma/client.js";
import { toFlagValue } from "./flags.dto.js";
import type { RuleInput } from "./flags.schema.js";

export type FlagStateAuditSnapshot = {
  flagId: string;
  environmentId: string;
  stateId: string;
  enabled: boolean;
  defaultValue: Prisma.JsonValue;
  version: number;
  rules: Array<{
    type: RuleType;
    order: number;
    percentage: number | null;
    userIds: string[];
    value: Prisma.JsonValue | null;
  }>;
};

type AuditState = {
  id: string;
  environmentId: string;
  enabled: boolean;
  defaultValue: Prisma.JsonValue;
  version: number;
  rules: Array<{
    type: RuleType;
    order: number;
    percentage: number | null;
    userIds: string[];
    value: Prisma.JsonValue | null;
  }>;
};

export function toFlagStateAuditSnapshot(params: {
  flagId: string;
  state: AuditState;
}): FlagStateAuditSnapshot {
  return {
    flagId: params.flagId,
    environmentId: params.state.environmentId,
    stateId: params.state.id,
    enabled: params.state.enabled,
    defaultValue: params.state.defaultValue,
    version: params.state.version,
    rules: params.state.rules.map((rule) => ({ ...rule })),
  };
}

export function toRuleInputs(snapshot: FlagStateAuditSnapshot): RuleInput[] {
  return [...snapshot.rules]
    .sort((left, right) => left.order - right.order)
    .map((rule) => ({
      type: rule.type,
      percentage: rule.percentage ?? undefined,
      userIds: rule.userIds,
      value: toFlagValue(rule.value) ?? undefined,
    }));
}