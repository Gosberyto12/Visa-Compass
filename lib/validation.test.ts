import assert from "node:assert/strict";
import test from "node:test";
import { parseVisaCheckInput } from "./validation";

const validInput = {
  passportCountry: "TZ",
  destinationCountry: "KE",
  purpose: "tourism",
  arrivalDate: "2027-03-15",
  departureDate: "2027-03-29",
};

test("parses valid travel inputs and defaults to an ordinary passport", () => {
  assert.deepEqual(parseVisaCheckInput(validInput), {
    ...validInput,
    passportType: "ordinary",
  });
});

test("rejects missing nationality and malformed country codes", () => {
  assert.equal(parseVisaCheckInput({ ...validInput, passportCountry: undefined }), null);
  assert.equal(parseVisaCheckInput({ ...validInput, passportCountry: "TZA" }), null);
});

test("rejects unsupported purposes and passport types", () => {
  assert.equal(parseVisaCheckInput({ ...validInput, purpose: "holiday" }), null);
  assert.equal(parseVisaCheckInput({ ...validInput, passportType: "temporary" }), null);
});

test("rejects impossible dates and departure before arrival", () => {
  assert.equal(parseVisaCheckInput({ ...validInput, arrivalDate: "2027-02-30" }), null);
  assert.equal(parseVisaCheckInput({ ...validInput, departureDate: "2027-03-14" }), null);
});

test("accepts an arrival-only request and optional supported purposes", () => {
  const result = parseVisaCheckInput({
    ...validInput,
    purpose: "family_visit",
    departureDate: undefined,
    passportType: "diplomatic",
  });
  assert.equal(result?.purpose, "family_visit");
  assert.equal(result?.passportType, "diplomatic");
  assert.equal(result?.departureDate, undefined);
});

test("rejects non-object request bodies", () => {
  assert.equal(parseVisaCheckInput(null), null);
  assert.equal(parseVisaCheckInput([]), null);
  assert.equal(parseVisaCheckInput("invalid"), null);
});
