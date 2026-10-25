import assert from "node:assert/strict";
import test from "node:test";
import { mockVisaProvider } from "./mock-provider";

test("mock provider clearly returns an unknown, unverified assessment", async () => {
  const result = await mockVisaProvider.check({
    passportCountry: "TZ",
    destinationCountry: "KE",
    purpose: "tourism",
    arrivalDate: "2027-03-15",
    passportType: "ordinary",
  });

  assert.equal(result.provider, "mock");
  assert.equal(result.isMock, true);
  assert.equal(result.assessmentStatus, "unverified");
  assert.equal(result.entryPathway, "unknown");
  assert.equal(result.dataFreshness, "unknown");
  assert.equal(result.maximumStayDays, null);
  assert.equal(result.requirements.length, 0);
  assert.equal(result.sources.length, 0);
  assert.equal(result.confirmationRequired, true);
});
