import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flagBucket } from "../../lib/hash.js";
import type { FlagSnapshot } from "../flags/flags.snapshot-types.js";
import { evaluate } from "./evaluate.js";

const snapshot: FlagSnapshot = {
  version: 1,
  flags: {
    "buy-one-click": {
      type: "BOOLEAN",
      enabled: true,
      defaultValue: true,
      rules: [],
    },
    "killed": {
      type: "BOOLEAN",
      enabled: false,
      defaultValue: true,
      rules: [],
    },
    headline: {
      type: "STRING",
      enabled: false,
      defaultValue: "Sale",
      rules: [],
    },
    banner: {
      type: "STRING",
      enabled: true,
      defaultValue: "Hello",
      rules: [{ type: "USER_ALLOW", userIds: ["vip"] }],
    },
    "new-feed": {
      type: "PERCENTAGE",
      enabled: true,
      defaultValue: false,
      rules: [{ type: "PERCENTAGE", percentage: 10, value: true }],
    },
    gated: {
      type: "BOOLEAN",
      enabled: true,
      defaultValue: false,
      rules: [
        { type: "USER_DENY", userIds: ["blocked"] },
        { type: "USER_ALLOW", userIds: ["vip"], value: true },
        { type: "ALL", value: true },
      ],
    },
  },
};

describe("evaluate", () => {
  it("returns NOT_FOUND for a missing flag", () => {
    assert.deepEqual(evaluate(snapshot, "missing", { userId: "u1" }), {
      value: false,
      reason: "NOT_FOUND",
    });
  });

  it("returns false for a disabled boolean even when defaultValue is true", () => {
    assert.deepEqual(evaluate(snapshot, "killed", { userId: "u1" }), {
      value: false,
      reason: "DISABLED",
    });
  });

  it("returns an empty string for a disabled string flag", () => {
    assert.deepEqual(evaluate(snapshot, "headline"), {
      value: "",
      reason: "DISABLED",
    });
  });

  it("returns defaultValue when no rules match", () => {
    assert.deepEqual(evaluate(snapshot, "buy-one-click"), {
      value: true,
      reason: "DEFAULT",
    });
  });

  it("applies USER_DENY before later rules", () => {
    assert.deepEqual(evaluate(snapshot, "gated", { userId: "blocked" }), {
      value: false,
      reason: "USER_DENY",
    });
  });

  it("applies USER_ALLOW", () => {
    assert.deepEqual(evaluate(snapshot, "gated", { userId: "vip" }), {
      value: true,
      reason: "USER_ALLOW",
    });
  });

  it("uses defaultValue for STRING USER_ALLOW without rule value", () => {
    assert.deepEqual(evaluate(snapshot, "banner", { userId: "vip" }), {
      value: "Hello",
      reason: "USER_ALLOW",
    });
  });

  it("falls through to ALL when user is not listed", () => {
    assert.deepEqual(evaluate(snapshot, "gated", { userId: "other" }), {
      value: true,
      reason: "ALL",
    });
  });

  it("skips PERCENTAGE without userId and uses defaultValue", () => {
    assert.deepEqual(evaluate(snapshot, "new-feed"), {
      value: false,
      reason: "DEFAULT",
    });
  });

  it("keeps a user in a stable percentage bucket", () => {
    const first = evaluate(snapshot, "new-feed", { userId: "u_stable" });
    const second = evaluate(snapshot, "new-feed", { userId: "u_stable" });
    assert.deepEqual(first, second);
    assert.equal(first.reason === "PERCENTAGE" || first.reason === "DEFAULT", true);
  });

  it("puts a user below 10% into the rollout", () => {
    const userId = findUserInBucket("new-feed", 10, true);
    assert.deepEqual(evaluate(snapshot, "new-feed", { userId }), {
      value: true,
      reason: "PERCENTAGE",
    });
  });

  it("keeps a user at or above 10% on the default", () => {
    const userId = findUserInBucket("new-feed", 10, false);
    assert.deepEqual(evaluate(snapshot, "new-feed", { userId }), {
      value: false,
      reason: "DEFAULT",
    });
  });
});

describe("flagBucket", () => {
  it("returns 0..99 and is deterministic", () => {
    const first = flagBucket("new-feed", "u_1");
    const second = flagBucket("new-feed", "u_1");
    assert.equal(first, second);
    assert.ok(first >= 0 && first < 100);
  });
});

function findUserInBucket(flagKey: string, percentage: number, inside: boolean): string {
  for (let i = 0; i < 5000; i += 1) {
    const userId = `user-${i}`;
    const inBucket = flagBucket(flagKey, userId) < percentage;
    if (inBucket === inside) {
      return userId;
    }
  }
  throw new Error(`Could not find user for bucket inside=${inside}`);
}
