import { createDraftRule, submitRuleForReview, attachSource, createVisaRequirement } from "@/app/admin/actions";
import { isAfricanCountryCode } from "@/lib/sample-data";
import { getEditorialAuthorization } from "@/lib/supabase/authorization";

export default async function AdminVisaRulesPage() {
  const authorization = await getEditorialAuthorization(["admin", "reviewer"]);
  if (authorization.status !== "authorized") return <p>Reviewer or administrator access is required.</p>;
  const { supabase } = authorization;
  const [countriesResult, rulesResult, sourcesResult] = await Promise.all([
    supabase.from("countries").select("id, iso2, common_name").order("common_name"),
    supabase.from("visa_rules").select("id, origin_country_id, destination_country_id, travel_purpose, passport_type, entry_pathway, verification_status, maximum_stay_days, next_review_at").order("updated_at", { ascending: false }).limit(100),
    supabase.from("data_sources").select("id, source_name, source_type").order("source_name"),
  ]);
  if (countriesResult.error || rulesResult.error || sourcesResult.error) {
    throw new Error("Unable to load visa rules and source choices.");
  }
  const countryMap = new Map((countriesResult.data ?? []).map((country) => [country.id, `${country.common_name} (${country.iso2})`]));
  const africanOriginCountries = (countriesResult.data ?? []).filter((country) => isAfricanCountryCode(country.iso2));
  const sources = sourcesResult.data ?? [];
  const editableRules = (rulesResult.data ?? []).filter((rule) =>
    ["draft", "stale", "withdrawn"].includes(rule.verification_status)
  );

  return (
    <>
      <p className="section-kicker">RULE MANAGEMENT</p>
      <h1>Visa rules</h1>
      <p>Create source-backed drafts. New records cannot be published directly.</p>
      <form className="simple-form trip-form admin-form" action={createDraftRule}>
        <label>Passport nationality<select name="originCountryId" required>{africanOriginCountries.map((country) => <option key={country.id} value={country.id}>{country.common_name}</option>)}</select></label>
        <label>Destination<select name="destinationCountryId" required>{(countriesResult.data ?? []).map((country) => <option key={country.id} value={country.id}>{country.common_name}</option>)}</select></label>
        <label>Passport type<select name="passportType" required><option value="ordinary">Ordinary</option><option value="diplomatic">Diplomatic</option><option value="official">Official</option><option value="other">Other</option></select></label>
        <label>Travel purpose<select name="purpose" required><option value="tourism">Tourism</option><option value="business">Business</option><option value="transit">Transit</option><option value="study">Study</option><option value="work">Work</option><option value="family_visit">Family visit</option><option value="other">Other</option></select></label>
        <label>Entry pathway<select name="entryPathway" required><option value="unknown">Unknown</option><option value="visa_free">Visa free</option><option value="visa_on_arrival">Visa on arrival</option><option value="evisa">eVisa</option><option value="visa_required">Visa required</option><option value="eta">ETA</option><option value="transit_visa">Transit visa</option></select></label>
        <label>Maximum stay in days (optional)<input name="maximumStayDays" type="number" min="1" max="3650" /></label>
        <label>Application URL (optional)<input name="applicationUrl" type="url" placeholder="https://" /></label>
        <label>Fee amount (optional)<input name="feeAmount" type="number" min="0" step="0.01" /></label>
        <label>Fee currency (optional)<input name="feeCurrency" type="text" minLength={3} maxLength={3} placeholder="USD" /></label>
        <label>Effective from (optional)<input name="effectiveFrom" type="date" /></label>
        <label>Effective until (optional)<input name="effectiveUntil" type="date" /></label>
        <label>Eligibility conditions (one per line)<textarea name="eligibilityConditions" rows={3} maxLength={15000} /></label>
        <label>Next review date<input name="nextReviewAt" type="datetime-local" required /></label>
        <button className="search-button" type="submit">Create draft</button>
      </form>
      <h2>Attach an existing source</h2>
      <form className="simple-form trip-form admin-form" action={attachSource}>
        <label>Rule<select name="ruleId" required>{editableRules.map((rule) => <option key={rule.id} value={rule.id}>{countryMap.get(rule.origin_country_id)} → {countryMap.get(rule.destination_country_id)} · {rule.travel_purpose} · {rule.verification_status}</option>)}</select></label>
        <label>Source<select name="sourceId" required>{sources.map((source) => <option key={source.id} value={source.id}>{source.source_name} · {source.source_type}</option>)}</select></label>
        <button className="save-button" type="submit">Attach source</button>
      </form>
      <h2>Add a requirement</h2>
      <form className="simple-form trip-form admin-form" action={createVisaRequirement}>
        <label>Rule<select name="ruleId" required>{editableRules.map((rule) => <option key={rule.id} value={rule.id}>{countryMap.get(rule.origin_country_id)} → {countryMap.get(rule.destination_country_id)} · {rule.travel_purpose}</option>)}</select></label>
        <label>Category<input name="category" type="text" maxLength={100} placeholder="passport, funds, accommodation..." required /></label>
        <label>Requirement name<input name="name" type="text" maxLength={200} required /></label>
        <label>Description<textarea name="description" rows={3} maxLength={2000} required /></label>
        <label>Mandatory status<select name="isMandatory" required><option value="unknown">Not verified</option><option value="required">Required</option><option value="optional">Optional</option></select></label>
        <label>Validity conditions (optional)<textarea name="validityConditions" rows={2} maxLength={1000} /></label>
        <button className="save-button" type="submit">Add requirement</button>
      </form>
      <h2>Existing rules</h2>
      <div className="saved-trip-list">
        {(rulesResult.data ?? []).map((rule) => (
          <article className="saved-trip" key={rule.id}>
            <h3>{countryMap.get(rule.origin_country_id)} → {countryMap.get(rule.destination_country_id)}</h3>
            <p>{rule.travel_purpose} · {rule.passport_type} · {rule.entry_pathway} · <strong>{rule.verification_status}</strong></p>
            <p>Maximum stay: {rule.maximum_stay_days ?? "not set"} · Next review: {rule.next_review_at ?? "not set"}</p>
            {rule.verification_status === "draft" && (
              <form action={submitRuleForReview}><input type="hidden" name="ruleId" value={rule.id} /><button className="save-button" type="submit">Submit for review</button></form>
            )}
          </article>
        ))}
        {(rulesResult.data ?? []).length === 0 && <p>No rules yet. Create a draft and attach sources before review.</p>}
      </div>
    </>
  );
}
