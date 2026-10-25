import assert from "node:assert/strict";
import test from "node:test";
import { resolveEntitlements } from "./entitlements";

const now = Date.parse("2027-01-01T00:00:00.000Z");

test("does not grant premium without an active, unexpired subscription", () => {
  assert.equal(resolveEntitlements(null, now).level, "free");
  assert.equal(resolveEntitlements({
    entitlement_level: "premium",
    subscription_status: "cancelled",
    current_period_end: "2027-02-01T00:00:00.000Z",
  }, now).level, "free");
  assert.equal(resolveEntitlements({
    entitlement_level: "premium",
    subscription_status: "active",
    current_period_end: "2026-12-31T23:59:59.000Z",
  }, now).level, "free");
});

test("grants premium entitlements only for active valid billing periods", () => {
  const result = resolveEntitlements({
    entitlement_level: "premium",
    subscription_status: "trialing",
    current_period_end: "2027-02-01T00:00:00.000Z",
  }, now);
  assert.equal(result.level, "premium");
  assert.equal(result.canSaveMultipleTrips, true);
  assert.equal(result.canExportReports, true);
  assert.equal(result.canConfigureReminders, true);
});
