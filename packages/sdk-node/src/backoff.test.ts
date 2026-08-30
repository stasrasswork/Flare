import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INITIAL_DELAY_MS, MAX_DELAY_MS, nextDelayMs } from "./backoff.js";

describe("nextDelayMs", () => {
  it("starts at 1s and doubles", () => {
    assert.equal(nextDelayMs(0), INITIAL_DELAY_MS);
    assert.equal(nextDelayMs(1), 2_000);
    assert.equal(nextDelayMs(2), 4_000);
  });

  it("caps at 30s", () => {
    assert.equal(nextDelayMs(10), MAX_DELAY_MS);
    assert.equal(nextDelayMs(5), MAX_DELAY_MS);
  });
});
