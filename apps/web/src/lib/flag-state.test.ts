import { describe, expect, it } from "vitest";
import { getPercentage, getStateForEnvironment, parsePercentage, percentageRules } from "./flag-state";
import type { Flag } from "../types/flare";

const flag: Flag = {
  id: "flag-1",
  key: "new-feed",
  name: "New feed",
  description: null,
  type: "PERCENTAGE",
  archivedAt: null,
  states: [
    { id: "state-prod", environmentId: "prod", enabled: true, defaultValue: false, version: 2, rules: [{ id: "rule", type: "PERCENTAGE", order: 0, percentage: 35, userIds: [], value: true }] },
    { id: "state-dev", environmentId: "dev", enabled: true, defaultValue: false, version: 1, rules: [] },
  ],
};

describe("flag state helpers", () => {
  it("selects state by environment id", () => {
    expect(getStateForEnvironment(flag, "prod")?.id).toBe("state-prod");
    expect(getStateForEnvironment(flag, "missing")).toBeUndefined();
  });

  it("reads percentage rules", () => {
    expect(getPercentage(getStateForEnvironment(flag, "prod"))).toBe(35);
    expect(getPercentage(getStateForEnvironment(flag, "dev"))).toBe(0);
  });

  it("accepts only whole percentages from 0 to 100", () => {
    expect(parsePercentage("0")).toBe(0);
    expect(parsePercentage("100")).toBe(100);
    expect(parsePercentage("10.5")).toBeUndefined();
    expect(parsePercentage("101")).toBeUndefined();
    expect(parsePercentage("-1")).toBeUndefined();
  });

  it("builds the API percentage rule shape", () => {
    expect(percentageRules(20)).toEqual([{ type: "PERCENTAGE", percentage: 20, value: true }]);
  });
});
