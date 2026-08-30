import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FlareError } from "./errors.js";
import { streamUrl } from "./url.js";

describe("streamUrl", () => {
  it("maps http to ws and appends /v1/stream", () => {
    assert.equal(streamUrl("http://localhost:3000"), "ws://localhost:3000/v1/stream");
  });

  it("maps https to wss and strips a trailing slash", () => {
    assert.equal(streamUrl("https://flags.example/"), "wss://flags.example/v1/stream");
  });

  it("rejects unknown protocols", () => {
    assert.throws(() => streamUrl("ftp://localhost"), FlareError);
  });
});
