import assert from "node:assert/strict";
import test from "node:test";
import { parseVisaCheckInput } from "./validation";
import { africanCountries, countries } from "./sample-data";

const validInput = {
  passportCountry: "TZ",
  destinationCountry: "KE",
  purpose: "tourism",
  departureDate: "2027-03-12",
  arrivalDate: "2027-03-15",
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
  assert.equal(parseVisaCheckInput({ ...validInput, passportCountry: "US" }), null);
  assert.equal(parseVisaCheckInput({ ...validInput, destinationCountry: "ZZ" }), null);
});

test("allows all African passport nationalities and worldwide destination codes", () => {
  assert.equal(africanCountries.length, 54);
  assert.equal(countries.length, 249);
  assert.equal(new Set(countries.map((country) => country.code)).size, countries.length);
  assert.ok(parseVisaCheckInput({ ...validInput, passportCountry: "ZA", destinationCountry: "JP" }));
  assert.ok(parseVisaCheckInput({ ...validInput, passportCountry: "SN", destinationCountry: "CA" }));
});

test("rejects unsupported purposes and passport types", () => {
  assert.equal(parseVisaCheckInput({ ...validInput, purpose: "holiday" }), null);
  assert.equal(parseVisaCheckInput({ ...validInput, passportType: "temporary" }), null);
});

test("rejects impossible dates and departure after arrival", () => {
  assert.equal(parseVisaCheckInput({ ...validInput, arrivalDate: "2027-02-30" }), null);
  assert.equal(parseVisaCheckInput({ ...validInput, departureDate: "2027-03-16" }), null);
});

test("accepts same-day departure and arrival", () => {
  const sameDay = { ...validInput, departureDate: validInput.arrivalDate };
  assert.deepEqual(parseVisaCheckInput(sameDay), {
    ...sameDay,
    passportType: "ordinary",
  });
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
