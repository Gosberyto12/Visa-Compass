import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "./route";

function request(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/visa-check", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": `api-test-${Math.random()}`,
      ...headers,
    },
    body,
  });
}

test("API returns the normalized unknown result with a request id", async () => {
  const response = await POST(request(JSON.stringify({
    passportCountry: "TZ",
    destinationCountry: "KE",
    purpose: "tourism",
    departureDate: "2027-03-12",
    arrivalDate: "2027-03-15",
  })));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(payload.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(payload.assessmentStatus, "unverified");
  assert.equal(payload.entryPathway, "unknown");
  assert.deepEqual(payload.sources, []);
  assert.equal(payload.confirmationRequired, true);
});

test("API rejects invalid input and malformed JSON with safe error shapes", async () => {
  const invalidInput = await POST(request(JSON.stringify({ passportCountry: "TZ" })));
  const invalidPayload = await invalidInput.json();
  assert.equal(invalidInput.status, 400);
  assert.equal(invalidPayload.error.code, "INVALID_INPUT");
  assert.ok(invalidPayload.error.requestId);

  const invalidJson = await POST(request("{"));
  const invalidJsonPayload = await invalidJson.json();
  assert.equal(invalidJson.status, 400);
  assert.equal(invalidJsonPayload.error.code, "INVALID_JSON");
});

test("API rejects unsupported media types and oversized requests", async () => {
  const mediaType = await POST(request("{}", { "content-type": "text/plain" }));
  assert.equal(mediaType.status, 415);

  const oversized = await POST(request("{}", { "content-length": "9000" }));
  assert.equal(oversized.status, 413);
});
