import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { envIdFromChannel, parseSnapshot, snapshotChannel } from "./flags.snapshot-types.js";

describe("parseSnapshot", () => {
  it("accepts a valid snapshot", () => {
    const snapshot = parseSnapshot(
      JSON.stringify({
        version: 2,
        flags: { a: { type: "BOOLEAN", enabled: true, defaultValue: false, rules: [] } },
      }),
    );
    assert.equal(snapshot?.version, 2);
    assert.equal(snapshot?.flags.a?.type, "BOOLEAN");
  });

  it("rejects invalid payloads", () => {
    assert.equal(parseSnapshot("{"), null);
    assert.equal(parseSnapshot(JSON.stringify({ flags: {} })), null);
    assert.equal(parseSnapshot(JSON.stringify({ version: 1, flags: null })), null);
  });
});

describe("envIdFromChannel", () => {
  it("parses flags:{envId} and rejects snapshot keys", () => {
    assert.equal(envIdFromChannel(snapshotChannel("env_1")), "env_1");
    assert.equal(envIdFromChannel("flags:env_1:snapshot"), null);
    assert.equal(envIdFromChannel("other:env_1"), null);
  });
});
