import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseClientMessage } from "./gateway.protocol.js";

describe("parseClientMessage", () => {
  it("accepts hello", () => {
    assert.deepEqual(
      parseClientMessage(
        JSON.stringify({ type: "hello", sdkKey: "flr_s_dev", sdk: "node", version: 3 }),
      ),
      { type: "hello", sdkKey: "flr_s_dev", sdk: "node", version: 3 },
    );
  });

  it("accepts resync", () => {
    assert.deepEqual(parseClientMessage(JSON.stringify({ type: "resync", version: 1 })), {
      type: "resync",
      version: 1,
    });
  });

  it("rejects invalid JSON and unknown types", () => {
    assert.equal(parseClientMessage("{"), null);
    assert.equal(parseClientMessage(JSON.stringify({ type: "ping" })), null);
    assert.equal(parseClientMessage(JSON.stringify({ type: "hello", sdkKey: "", sdk: "node" })), null);
  });
});
