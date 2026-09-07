import type { Flag, FlagState, RuleInput } from "../types/flare";

export function getStateForEnvironment(flag: Flag, environmentId: string): FlagState | undefined {
  return flag.states.find((state) => state.environmentId === environmentId);
}

export function getPercentage(state: FlagState | undefined): number {
  return state?.rules.find((rule) => rule.type === "PERCENTAGE")?.percentage ?? 0;
}

export function parsePercentage(value: string): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }

  const percentage = Number(value);
  return percentage >= 0 && percentage <= 100 ? percentage : undefined;
}

export function percentageRules(percentage: number): RuleInput[] {
  return [{ type: "PERCENTAGE", percentage, value: true }];
}
