import type { VisaCheckInput, VisaProvider } from "../visa-types";

// Deliberately fictional sample output. Never use it as real travel guidance.
export const mockVisaProvider: VisaProvider = {
  async check(input: VisaCheckInput) {
    return {
      provider: "mock",
      isMock: true,
      assessmentStatus: "unverified",
      entryPathway: "unknown",
      summary: `No verified visa determination is available for ${input.passportCountry} to ${input.destinationCountry}.`,
      eligibilityConditions: [],
      maximumStayDays: null,
      requirements: [],
      applicationUrl: null,
      fees: null,
      processingInformation: null,
      sources: [],
      lastVerifiedAt: null,
      dataFreshness: "unknown",
      limitations: [
        "This demonstration response does not contain visa rules or eligibility decisions.",
        "Confirm the requirements with the destination country's official immigration authority.",
      ],
      confirmationRequired: true,
      disclaimer:
        "This is mock development data, not travel advice. Confirm requirements with the destination's official immigration authority before booking or travelling.",
    };
  },
};
