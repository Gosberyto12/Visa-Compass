import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "../supabase/config";
import type { VisaCheckInput, VisaProvider, VisaResult } from "../visa-types";

function providerTimeoutMs(): number {
  const value = process.env.VISA_PROVIDER_TIMEOUT_MS;
  if (!value) return 8_000;
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 1_000 || timeout > 30_000) {
    throw new Error("VISA_PROVIDER_TIMEOUT_MS must be a whole number from 1000 to 30000.");
  }
  return timeout;
}

function noPublishedData(input: VisaCheckInput, explanation: string): VisaResult {
  return {
    provider: "database",
    isMock: false,
    assessmentStatus: "unverified",
    entryPathway: "unknown",
    summary: `No current published visa assessment is available for ${input.passportCountry} to ${input.destinationCountry}.`,
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
      explanation,
      "Confirm requirements with the destination country's official immigration authority.",
    ],
    confirmationRequired: true,
    disclaimer:
      "VisaCompass information is for preparation only and does not guarantee a visa or admission. Confirm current requirements with official authorities.",
  };
}

export const databaseVisaProvider: VisaProvider = {
  async check(input) {
    const config = getSupabasePublicConfig();
    if (!config) {
      throw new Error("Supabase public project configuration is required for the database provider.");
    }

    const timeoutMs = providerTimeoutMs();
    const fetchWithTimeout: typeof fetch = async (resource, init) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const signal = init?.signal
        ? AbortSignal.any([init.signal, controller.signal])
        : controller.signal;
      try {
        return await fetch(resource, { ...init, signal });
      } finally {
        clearTimeout(timeout);
      }
    };

    const supabase = createClient(config.url, config.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetchWithTimeout },
    });
    const [originResult, destinationResult] = await Promise.all([
      supabase.from("countries").select("id").eq("iso2", input.passportCountry).maybeSingle(),
      supabase.from("countries").select("id").eq("iso2", input.destinationCountry).maybeSingle(),
    ]);
    if (originResult.error || destinationResult.error) {
      throw new Error("Unable to resolve search countries from the visa database.");
    }
    if (!originResult.data || !destinationResult.data) {
      return noPublishedData(input, "One or both country codes are not in the configured country directory.");
    }

    const endDate = input.departureDate ?? input.arrivalDate;
    const { data, error } = await supabase
      .from("public_visa_assessments")
      .select(
        "id, assessment_status, entry_pathway, eligibility_conditions, maximum_stay_days, effective_from, effective_until, source_checked_at, application_url, verified_fee_amount, verified_fee_currency, processing_information, conflict_flag"
      )
      .eq("origin_country_id", originResult.data.id)
      .eq("destination_country_id", destinationResult.data.id)
      .eq("passport_type", input.passportType)
      .eq("travel_purpose", input.purpose)
      .maybeSingle();

    if (error) throw new Error("Unable to load a published visa assessment.");
    if (!data) {
      return noPublishedData(input, "No reviewed rule matching this passport, purpose and travel-date range is published.");
    }

    if ((data.effective_from && input.arrivalDate < data.effective_from) ||
        (data.effective_until && endDate > data.effective_until)) {
      return noPublishedData(input, "The recorded rule does not cover the requested travel dates.");
    }

    const checkedAt = data.source_checked_at;
    const reviewDue = data.assessment_status === "stale";
    const conflicted = data.assessment_status === "conflicted" || data.conflict_flag === true;
    const uncertain = conflicted || reviewDue;
    let sources: VisaResult["sources"] = [];
    let requirements: VisaResult["requirements"] = [];
    if (!uncertain) {
      const [sourceLinks, requirementResult] = await Promise.all([
        supabase
          .from("visa_rule_sources")
          .select("data_source_id")
          .eq("visa_rule_id", data.id),
        supabase
          .from("visa_requirements")
          .select("requirement_category, description, is_mandatory")
          .eq("visa_rule_id", data.id),
      ]);
      if (sourceLinks.error || requirementResult.error) {
        throw new Error("Unable to load published visa source details.");
      }
      const sourceIds = (sourceLinks.data ?? []).map((link) => link.data_source_id);
      if (sourceIds.length > 0) {
        const sourceResult = await supabase
          .from("data_sources")
          .select("source_name, source_url, source_type")
          .in("id", sourceIds);
        if (sourceResult.error) throw new Error("Unable to load published source references.");
        sources = (sourceResult.data ?? [])
          .filter((source) => /^https:\/\//i.test(source.source_url))
          .map((source) => ({
            name: source.source_name,
            url: source.source_url,
            sourceType: source.source_type as "official" | "licensed_provider" | "other",
          }));
      }
      requirements = (requirementResult.data ?? []).map((requirement) => ({
          category: requirement.requirement_category,
          description: requirement.description,
          isMandatory: requirement.is_mandatory,
          verified: requirement.is_mandatory !== null,
        }));
    }
    const pathway = uncertain ? "unknown" : data.entry_pathway;
    const limitations = [
      ...(reviewDue ? ["This published information is past its scheduled review date."] : []),
      ...(conflicted ? ["Authoritative sources conflict; this rule requires editorial review."] : []),
    ];

    return {
      provider: "database",
      isMock: false,
      assessmentStatus: conflicted ? "conflicted" : reviewDue ? "unverified" : "verified",
      entryPathway: pathway,
      summary: conflicted
        ? "Conflicting source information is recorded for this route. No entry pathway is asserted until editorial review resolves the conflict."
        : reviewDue
          ? "Previously published information is past its review date. No current entry pathway is asserted."
          : `Published visa information is available for ${input.passportCountry} to ${input.destinationCountry}.`,
      eligibilityConditions: uncertain ? [] : data.eligibility_conditions,
      maximumStayDays: uncertain ? null : data.maximum_stay_days,
      requirements,
      applicationUrl: uncertain ? null : data.application_url,
      fees:
        uncertain || data.verified_fee_amount === null || data.verified_fee_currency === null
          ? null
          : { amount: Number(data.verified_fee_amount), currency: data.verified_fee_currency },
      processingInformation: uncertain ? null : data.processing_information,
      sources,
      lastVerifiedAt: checkedAt,
      dataFreshness: reviewDue ? "stale" : "current",
      limitations,
      confirmationRequired: reviewDue || conflicted,
      disclaimer:
        "VisaCompass information is for preparation only and does not guarantee a visa or admission. Confirm current requirements with official authorities.",
    };
  },
};
