import assert from "node:assert/strict";
import test from "node:test";
import { allowRequest } from "./rate-limit";

test("allows requests up to the limit and resets the window", () => {
  const key = `rate-limit-test-${Date.now()}`;
  const start = 1_000_000;
  for (let index = 0; index < 20; index += 1) {
    assert.equal(allowRequest(key, start + index), true);
  }
  assert.equal(allowRequest(key, start + 21), false);
  assert.equal(allowRequest(key, start + 60_001), true);
});

test("tracks independent client keys independently", () => {
  const start = 2_000_000;
  assert.equal(allowRequest(`client-a-${start}`, start), true);
  assert.equal(allowRequest(`client-b-${start}`, start), true);
});
