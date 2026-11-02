"use server";

import { revalidatePath } from "next/cache";
import { getEditorialAuthorization, type EditorialRole } from "@/lib/supabase/authorization";
import { isAfricanCountryCode } from "@/lib/sample-data";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireEditorialRole(role: EditorialRole) {
  const authorization = await getEditorialAuthorization([role, "admin"]);
  if (authorization.status !== "authorized") {
    throw new Error("An authorized editorial account is required for this action.");
  }
  return authorization;
}

const purposes = ["tourism", "business", "transit", "study", "work", "family_visit", "other"];
const pathways = ["visa_free", "visa_on_arrival", "evisa", "visa_required", "eta", "transit_visa", "unknown"];
const ruleStatuses = ["pending_review", "published", "stale", "withdrawn"];

export async function createDraftRule(formData: FormData) {
  const { supabase } = await requireEditorialRole("reviewer");
  const originCountryId = text(formData, "originCountryId");
  const destinationCountryId = text(formData, "destinationCountryId");
  const purpose = text(formData, "purpose");
  const passportType = text(formData, "passportType");
  const pathway = text(formData, "entryPathway");
  const nextReviewAt = text(formData, "nextReviewAt");
  const maxStay = text(formData, "maximumStayDays");
  const applicationUrl = text(formData, "applicationUrl");
  const feeAmount = text(formData, "feeAmount");
  const feeCurrency = text(formData, "feeCurrency").toUpperCase();
  const effectiveFrom = text(formData, "effectiveFrom") || null;
  const effectiveUntil = text(formData, "effectiveUntil") || null;
  const eligibilityConditions = text(formData, "eligibilityConditions")
    .split(/\r?\n/)
    .map((condition) => condition.trim())
    .filter(Boolean);

  if (!/^[0-9a-f-]{36}$/i.test(originCountryId) ||
      !/^[0-9a-f-]{36}$/i.test(destinationCountryId) ||
      originCountryId === destinationCountryId ||
      !purposes.includes(purpose) ||
      !["ordinary", "diplomatic", "official", "other"].includes(passportType) ||
      !pathways.includes(pathway)) {
    throw new Error("Complete the route, passport, purpose and entry pathway with supported values.");
  }
  if (!nextReviewAt || Number.isNaN(Date.parse(nextReviewAt))) {
    throw new Error("A scheduled review date is required.");
  }
  if (maxStay && (!/^\d+$/.test(maxStay) || Number(maxStay) <= 0)) {
    throw new Error("Maximum stay must be a positive number of days.");
  }
  if (applicationUrl && !/^https:\/\//i.test(applicationUrl)) {
    throw new Error("Application links must use HTTPS.");
  }
  if ((effectiveFrom && !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) ||
      (effectiveUntil && !/^\d{4}-\d{2}-\d{2}$/.test(effectiveUntil)) ||
      (effectiveFrom && effectiveUntil && effectiveUntil < effectiveFrom)) {
    throw new Error("Enter a valid effective date range.");
  }
  if (eligibilityConditions.length > 30 || eligibilityConditions.some((condition) => condition.length > 500)) {
    throw new Error("Eligibility conditions are limited to 30 lines of 500 characters each.");
  }
  if ((feeAmount && !/^\d+(\.\d{1,2})?$/.test(feeAmount)) ||
      (feeCurrency && !/^[A-Z]{3}$/.test(feeCurrency)) ||
      Boolean(feeAmount) !== Boolean(feeCurrency)) {
    throw new Error("Provide both a non-negative fee amount and a three-letter currency code.");
  }

  const [originCountry, destinationCountry] = await Promise.all([
    supabase.from("countries").select("iso2").eq("id", originCountryId).maybeSingle(),
    supabase.from("countries").select("iso2").eq("id", destinationCountryId).maybeSingle(),
  ]);
  if (originCountry.error || destinationCountry.error) {
    throw new Error("Unable to validate the selected countries.");
  }
  if (!originCountry.data || !destinationCountry.data || !isAfricanCountryCode(originCountry.data.iso2)) {
    throw new Error("Choose an African passport nationality and a valid destination.");
  }

  const { error } = await supabase.from("visa_rules").insert({
    origin_country_id: originCountryId,
    destination_country_id: destinationCountryId,
    travel_purpose: purpose,
    passport_type: passportType,
    entry_pathway: pathway,
    maximum_stay_days: maxStay ? Number(maxStay) : null,
    application_url: applicationUrl || null,
    verified_fee_amount: feeAmount ? Number(feeAmount) : null,
    verified_fee_currency: feeCurrency || null,
    eligibility_conditions: eligibilityConditions,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    next_review_at: new Date(nextReviewAt).toISOString(),
  });
  if (error) throw new Error("Unable to create the draft visa rule.");
  revalidatePath("/admin/visa-rules");
}

export async function createDataSource(formData: FormData) {
  const { supabase, userId } = await requireEditorialRole("reviewer");
  const sourceName = text(formData, "sourceName");
  const sourceType = text(formData, "sourceType");
  const sourceUrl = text(formData, "sourceUrl");
  const licenseNotes = text(formData, "licenseNotes");
  const lastCheckedAt = text(formData, "lastCheckedAt");
  const nextReviewAt = text(formData, "nextReviewAt");
  const mayDisplay = formData.get("mayDisplay") === "on";
  const mayStore = formData.get("mayStore") === "on";
  const mayCache = formData.get("mayCache") === "on";

  if (!sourceName || sourceName.length > 200 || !["official", "licensed_provider", "other"].includes(sourceType)) {
    throw new Error("Enter a valid source name and source type.");
  }
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:") throw new Error("HTTPS required.");
  } catch {
    throw new Error("Source links must be valid HTTPS URLs.");
  }
  if (sourceType === "licensed_provider" && (!licenseNotes || !mayDisplay || !mayStore)) {
    throw new Error("Licensed data requires contract notes and explicit permission to display and store it.");
  }
  if (lastCheckedAt && Number.isNaN(Date.parse(lastCheckedAt))) throw new Error("Enter a valid source-check date.");
  if (nextReviewAt && Number.isNaN(Date.parse(nextReviewAt))) throw new Error("Enter a valid next-review date.");

  const { error } = await supabase.from("data_sources").insert({
    source_name: sourceName,
    source_type: sourceType,
    source_url: sourceUrl,
    created_by: userId,
    license_notes: licenseNotes || null,
    may_display: mayDisplay,
    may_store: mayStore,
    may_cache: mayCache,
    last_checked_at: lastCheckedAt ? new Date(lastCheckedAt).toISOString() : null,
    next_review_at: nextReviewAt ? new Date(nextReviewAt).toISOString() : null,
  });
  if (error) throw new Error("Unable to add this source.");
  revalidatePath("/admin/sources");
}

export async function attachSource(formData: FormData) {
  const { supabase } = await requireEditorialRole("reviewer");
  const ruleId = text(formData, "ruleId");
  const sourceId = text(formData, "sourceId");
  if (!/^[0-9a-f-]{36}$/i.test(ruleId) || !/^[0-9a-f-]{36}$/i.test(sourceId)) {
    throw new Error("Choose a valid rule and source.");
  }
  const { error } = await supabase.from("visa_rule_sources").insert({
    visa_rule_id: ruleId,
    data_source_id: sourceId,
  });
  if (error) throw new Error("Unable to attach the source; check the rule and source permissions.");
  revalidatePath("/admin/visa-rules");
  revalidatePath("/admin/reviews");
}

export async function createVisaRequirement(formData: FormData) {
  const { supabase } = await requireEditorialRole("reviewer");
  const ruleId = text(formData, "ruleId");
  const category = text(formData, "category");
  const name = text(formData, "name");
  const description = text(formData, "description");
  const validityConditions = text(formData, "validityConditions");
  const mandatoryValue = text(formData, "isMandatory");
  if (!/^[0-9a-f-]{36}$/i.test(ruleId) || !category || category.length > 100 ||
      !name || name.length > 200 || !description || description.length > 2000 ||
      validityConditions.length > 1000 || !["required", "optional", "unknown"].includes(mandatoryValue)) {
    throw new Error("Complete the requirement category, name, description and verification status.");
  }

  const { error } = await supabase.from("visa_requirements").insert({
    visa_rule_id: ruleId,
    requirement_category: category,
    requirement_name: name,
    description,
    is_mandatory: mandatoryValue === "unknown" ? null : mandatoryValue === "required",
    validity_conditions: validityConditions || null,
  });
  if (error) throw new Error("Unable to add this requirement. Published rules must return to review first.");
  revalidatePath("/admin/visa-rules");
}

export async function changeRuleStatus(formData: FormData) {
  const targetStatus = text(formData, "status");
  const role: EditorialRole = targetStatus === "published" ? "publisher" : "reviewer";
  const { supabase } = await requireEditorialRole(role);
  const ruleId = text(formData, "ruleId");
  if (!/^[0-9a-f-]{36}$/i.test(ruleId) || !ruleStatuses.includes(targetStatus)) {
    throw new Error("Choose a valid rule status.");
  }

  if (targetStatus === "published") {
    const { data, error } = await supabase.from("visa_rules")
      .update({ verification_status: targetStatus })
      .eq("id", ruleId)
      .eq("verification_status", "verified")
      .select("id");
    if (error || !data?.length) {
      throw new Error("Only a verified, source-backed rule with a scheduled review can be published.");
    }
  } else {
    if (targetStatus === "pending_review" && role !== "reviewer") {
      throw new Error("Reviewer permission is required to reopen a rule for review.");
    }
    if (targetStatus === "pending_review") {
      const { data: sources, error: sourceError } = await supabase
        .from("visa_rule_sources").select("data_source_id").eq("visa_rule_id", ruleId);
      if (sourceError) throw new Error("Unable to check the rule's source references.");
      if (!sources?.length) throw new Error("Attach at least one supporting source before review.");
    }
    let query = supabase.from("visa_rules")
      .update({ verification_status: targetStatus })
      .eq("id", ruleId);
    if (targetStatus === "pending_review") query = query.eq("verification_status", "stale");
    const { data, error } = await query.select("id");
    if (error || !data?.length) throw new Error("Unable to update the visa-rule status.");
  }
  revalidatePath("/admin");
  revalidatePath("/admin/visa-rules");
  revalidatePath("/admin/reviews");
}

export async function submitRuleForReview(formData: FormData) {
  const { supabase } = await requireEditorialRole("reviewer");
  const ruleId = text(formData, "ruleId");
  if (!/^[0-9a-f-]{36}$/i.test(ruleId)) throw new Error("Invalid rule identifier.");
  const { data: sources, error: sourceError } = await supabase
    .from("visa_rule_sources").select("data_source_id").eq("visa_rule_id", ruleId);
  if (sourceError) throw new Error("Unable to check the rule's source references.");
  if (!sources?.length) throw new Error("Attach at least one supporting source before review.");
  const { data, error } = await supabase.from("visa_rules")
    .update({ verification_status: "pending_review" })
    .eq("id", ruleId)
    .eq("verification_status", "draft")
    .select("id");
  if (error || !data?.length) throw new Error("Unable to submit this draft for review.");
  revalidatePath("/admin/visa-rules");
  revalidatePath("/admin/reviews");
}

export async function reviewVisaRule(formData: FormData) {
  const { supabase } = await requireEditorialRole("reviewer");
  const ruleId = text(formData, "ruleId");
  const outcome = text(formData, "outcome");
  const method = text(formData, "method");
  const notes = text(formData, "notes");
  if (!/^[0-9a-f-]{36}$/i.test(ruleId) || !["approved", "rejected", "needs_changes", "conflict"].includes(outcome) || !method) {
    throw new Error("Provide a valid review outcome and verification method.");
  }
  const { error } = await supabase.rpc("review_visa_rule", {
    target_rule_id: ruleId,
    review_outcome: outcome,
    verification_method: method,
    review_notes: notes || null,
  });
  if (error) throw new Error("Review action failed. Confirm source references and your reviewer role.");
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/visa-rules");
}

export async function flagRuleConflict(formData: FormData) {
  const { supabase } = await requireEditorialRole("reviewer");
  const ruleId = text(formData, "ruleId");
  const notes = text(formData, "notes");
  if (!/^[0-9a-f-]{36}$/i.test(ruleId) || !notes) throw new Error("Describe the conflict before flagging it.");
  const { error } = await supabase.from("visa_rules")
    .update({ conflict_flag: true, conflict_notes: notes, verification_status: "stale" })
    .eq("id", ruleId);
  if (error) throw new Error("Unable to flag this rule for conflict review.");
  revalidatePath("/admin/reviews");
}
