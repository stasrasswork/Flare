import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { helloMessage, parseServerMessage, resyncMessage } from "./protocol.js";

describe("helloMessage", () => {
  it("serializes sdk: node", () => {
    assert.deepEqual(helloMessage("flr_s_dev_seed_local_only", 3), {
      type: "hello",
      sdkKey: "flr_s_dev_seed_local_only",
      sdk: "node",
      version: 3,
    });
  });
});

describe("resyncMessage", () => {
  it("serializes version", () => {
    assert.deepEqual(resyncMessage(4), { type: "resync", version: 4 });
  });
});

describe("parseServerMessage", () => {
  it("accepts a snapshot", () => {
    assert.deepEqual(
      parseServerMessage(
        JSON.stringify({
          type: "snapshot",
          version: 2,
          flags: { a: { type: "BOOLEAN", enabled: true, defaultValue: false, rules: [] } },
        }),
      ),
      {
        type: "snapshot",
        version: 2,
        flags: { a: { type: "BOOLEAN", enabled: true, defaultValue: false, rules: [] } },
      },
    );
  });

  it("accepts an error", () => {
    assert.deepEqual(
      parseServerMessage(JSON.stringify({ type: "error", code: "UNAUTHORIZED", message: "Invalid SDK key" })),
      { type: "error", code: "UNAUTHORIZED", message: "Invalid SDK key" },
    );
  });

  it("rejects invalid payloads", () => {
    assert.equal(parseServerMessage("{"), null);
    assert.equal(parseServerMessage(JSON.stringify({ type: "ping" })), null);
    assert.equal(parseServerMessage(JSON.stringify({ type: "snapshot", flags: {} })), null);
    assert.equal(parseServerMessage(JSON.stringify({ type: "error", code: "NOPE", message: "x" })), null);
  });
});
