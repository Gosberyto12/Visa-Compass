export type TripPurpose =
  | "tourism"
  | "business"
  | "transit"
  | "study"
  | "work"
  | "family_visit"
  | "other";

export type PassportType = "ordinary" | "diplomatic" | "official" | "other";

export type VisaCheckInput = {
  passportCountry: string;
  destinationCountry: string;
  purpose: TripPurpose;
  arrivalDate: string;
  departureDate?: string;
  passportType: PassportType;
};

export type VisaEntryPathway =
  | "visa_free"
  | "visa_on_arrival"
  | "evisa"
  | "visa_required"
  | "eta"
  | "transit_visa"
  | "unknown";

export type VisaResult = {
  provider: "mock" | "sherpa" | "database";
  isMock: boolean;
  assessmentStatus: "verified" | "unverified" | "conflicted";
  entryPathway: VisaEntryPathway;
  summary: string;
  eligibilityConditions: string[];
  maximumStayDays: number | null;
  requirements: {
    category: string;
    description: string;
    isMandatory: boolean | null;
    verified: boolean;
  }[];
  applicationUrl: string | null;
  fees: {
    amount: number;
    currency: string;
  } | null;
  processingInformation: string | null;
  sources: {
    name: string;
    url: string;
    sourceType: "official" | "licensed_provider" | "other";
  }[];
  lastVerifiedAt: string | null;
  dataFreshness: "current" | "stale" | "unknown";
  limitations: string[];
  confirmationRequired: boolean;
  disclaimer: string;
};

export type VisaProvider = {
  check(input: VisaCheckInput): Promise<VisaResult>;
};
