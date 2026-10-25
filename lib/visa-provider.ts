import type { VisaCheckInput, VisaProvider, VisaResult } from "./visa-types";
import { mockVisaProvider } from "./providers/mock-provider";
import { sherpaVisaProvider } from "./providers/sherpa-provider";
import { databaseVisaProvider } from "./providers/database-provider";

export function getVisaProvider(): VisaProvider {
  const selected = (process.env.VISA_PROVIDER || "mock").toLowerCase();

  if (selected === "mock") return mockVisaProvider;
  if (selected === "sherpa") return sherpaVisaProvider;
  if (selected === "database") return databaseVisaProvider;

  throw new Error(`Unsupported VISA_PROVIDER: ${selected}`);
}

export async function runVisaCheck(input: VisaCheckInput): Promise<VisaResult> {
  return getVisaProvider().check(input);
}
