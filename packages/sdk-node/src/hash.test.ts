import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flagBucket } from "./hash.js";

describe("flagBucket", () => {
  it("returns 0..99 and is deterministic", () => {
    const first = flagBucket("new-feed", "u_1");
    const second = flagBucket("new-feed", "u_1");
    assert.equal(first, second);
    assert.ok(first >= 0 && first < 100);
  });

  it("matches the API hash for a fixed input", () => {
    // Same FNV-1a as apps/api/src/lib/hash.ts
    assert.equal(flagBucket("new-feed", "u_1"), 53);
  });
});
