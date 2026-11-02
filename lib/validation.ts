import type { PassportType, TripPurpose, VisaCheckInput } from "./visa-types";
import { isAfricanCountryCode, isCountryCode } from "./sample-data";

const purposes: TripPurpose[] = [
  "tourism",
  "business",
  "transit",
  "study",
  "work",
  "family_visit",
  "other",
];
const passportTypes: PassportType[] = ["ordinary", "diplomatic", "official", "other"];
const countryCode = /^[A-Z]{2}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

export function parseVisaCheckInput(value: unknown): VisaCheckInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;

  if (typeof v.passportCountry !== "string" ||
      !countryCode.test(v.passportCountry) ||
      !isAfricanCountryCode(v.passportCountry)) return null;
  if (typeof v.destinationCountry !== "string" ||
      !countryCode.test(v.destinationCountry) ||
      !isCountryCode(v.destinationCountry)) return null;
  if (typeof v.purpose !== "string" || !purposes.includes(v.purpose as TripPurpose)) return null;
  if (typeof v.arrivalDate !== "string" || !isValidDate(v.arrivalDate)) return null;

  if (
    v.departureDate !== undefined &&
    (typeof v.departureDate !== "string" ||
      !isValidDate(v.departureDate) ||
      v.departureDate > v.arrivalDate)
  ) {
    return null;
  }

  const passportType = v.passportType ?? "ordinary";
  if (typeof passportType !== "string" || !passportTypes.includes(passportType as PassportType)) {
    return null;
  }

  return {
    passportCountry: v.passportCountry,
    destinationCountry: v.destinationCountry,
    purpose: v.purpose as TripPurpose,
    arrivalDate: v.arrivalDate,
    ...(typeof v.departureDate === "string" ? { departureDate: v.departureDate } : {}),
    passportType: passportType as PassportType,
  };
}
