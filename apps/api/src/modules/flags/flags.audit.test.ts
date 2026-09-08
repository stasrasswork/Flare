import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toFlagStateAuditSnapshot, toRuleInputs } from "./flags.audit.js";
import { auditSnapshotSchemaForType } from "./flags.schema.js";

const snapshot = toFlagStateAuditSnapshot({
  flagId: "flag-1",
  state: {
    id: "state-1",
    environmentId: "env-1",
    enabled: true,
    defaultValue: false,
    version: 4,
    rules: [
      { type: "USER_ALLOW", order: 1, percentage: null, userIds: ["vip"], value: true },
      { type: "PERCENTAGE", order: 0, percentage: 20, userIds: [], value: true },
    ],
  },
});

describe("flag state audit snapshots", () => {
  it("preserves identity and restores rules in order", () => {
    assert.equal(snapshot.flagId, "flag-1");
    assert.equal(snapshot.environmentId, "env-1");
    assert.deepEqual(toRuleInputs(snapshot), [
      { type: "PERCENTAGE", percentage: 20, userIds: [], value: true },
      { type: "USER_ALLOW", percentage: undefined, userIds: ["vip"], value: true },
    ]);
  });

  it("validates type-specific snapshots", () => {
    assert.equal(auditSnapshotSchemaForType("BOOLEAN").safeParse(snapshot).success, true);
    assert.equal(
      auditSnapshotSchemaForType("STRING").safeParse({ ...snapshot, defaultValue: false }).success,
      false,
    );
  });

  it("rejects malformed snapshots", () => {
    assert.equal(
      auditSnapshotSchemaForType("BOOLEAN").safeParse({ ...snapshot, rules: [{ type: "PERCENTAGE" }] }).success,
      false,
    );
  });
});
