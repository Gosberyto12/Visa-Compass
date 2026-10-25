import { changeRuleStatus, flagRuleConflict, reviewVisaRule } from "@/app/admin/actions";
import { getEditorialAuthorization } from "@/lib/supabase/authorization";

export default async function AdminReviewsPage() {
  const authorization = await getEditorialAuthorization(["admin", "reviewer", "publisher"]);
  if (authorization.status !== "authorized") return <p>Authorized editorial access is required.</p>;
  const { supabase, roles } = authorization;
  const { data: rules, error } = await supabase
    .from("visa_rules")
    .select("id, origin_country_id, destination_country_id, travel_purpose, passport_type, entry_pathway, verification_status, conflict_flag, conflict_notes, source_checked_at, next_review_at")
    .in("verification_status", ["pending_review", "verified", "published", "stale"])
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Unable to load the verification queue.");
  const { data: countries, error: countryError } = await supabase.from("countries").select("id, common_name");
  if (countryError) throw new Error("Unable to load route names.");
  const ruleIds = (rules ?? []).map((rule) => rule.id);
  const { data: versions, error: versionError } = ruleIds.length
    ? await supabase.from("visa_rule_versions").select("id, visa_rule_id, version_number, rule_snapshot, effective_from, effective_until, published_at").in("visa_rule_id", ruleIds).order("published_at", { ascending: false })
    : { data: [], error: null };
  if (versionError) throw new Error("Unable to load publication history.");
  const countryNames = new Map((countries ?? []).map((country) => [country.id, country.common_name]));

  return (
    <>
      <p className="section-kicker">VERIFICATION QUEUE</p>
      <h1>Review and publication</h1>
      <p>Approval records the review method, sources and outcome. Publication requires a separate publisher role.</p>
      <div className="saved-trip-list">
        {(rules ?? []).map((rule) => (
          <article className="saved-trip" key={rule.id}>
            <h2>{countryNames.get(rule.origin_country_id)} → {countryNames.get(rule.destination_country_id)}</h2>
            <p>{rule.travel_purpose} · {rule.passport_type} · <strong>{rule.verification_status}</strong></p>
            <p>Entry pathway draft: {rule.entry_pathway} · Checked: {rule.source_checked_at ?? "not checked"} · Review due: {rule.next_review_at ?? "not scheduled"}</p>
            {rule.conflict_flag && <div className="demo-warning"><strong>Conflicting sources</strong>{rule.conflict_notes ?? "Conflict details have not been recorded."}</div>}
            {(versions ?? []).filter((version) => version.visa_rule_id === rule.id).map((version) => (
              <details key={version.id}>
                <summary>Published version {version.version_number} · {version.published_at}</summary>
                <p>Effective: {version.effective_from ?? "not set"} – {version.effective_until ?? "open-ended"}</p>
                <pre>{JSON.stringify(version.rule_snapshot, null, 2)}</pre>
              </details>
            ))}
            {rule.verification_status === "pending_review" && roles.some((role) => role === "reviewer" || role === "admin") && (
              <form className="simple-form" action={reviewVisaRule}>
                <input type="hidden" name="ruleId" value={rule.id} />
                <label>Verification method<input name="method" type="text" maxLength={300} placeholder="Official website review, written authority response..." required /></label>
                <label>Review notes<textarea name="notes" rows={3} maxLength={2000} /></label>
                <label>Outcome<select name="outcome" required><option value="approved">Approve as verified</option><option value="needs_changes">Needs changes</option><option value="rejected">Reject</option><option value="conflict">Conflicting sources</option></select></label>
                <button className="save-button" type="submit">Record review</button>
              </form>
            )}
            {rule.verification_status === "verified" && roles.some((role) => role === "publisher" || role === "admin") && (
              <form action={changeRuleStatus}><input type="hidden" name="ruleId" value={rule.id} /><input type="hidden" name="status" value="published" /><button className="search-button" type="submit">Publish verified rule</button></form>
            )}
            {rule.verification_status === "published" && roles.some((role) => role === "reviewer" || role === "admin") && (
              <>
                <form className="simple-form" action={flagRuleConflict}>
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <label>Flag a source conflict<textarea name="notes" rows={2} maxLength={2000} required /></label>
                  <button className="save-button" type="submit">Flag conflict</button>
                </form>
                <form action={changeRuleStatus}><input type="hidden" name="ruleId" value={rule.id} /><input type="hidden" name="status" value="stale" /><button className="save-button" type="submit">Mark stale</button></form>
                <form action={changeRuleStatus}><input type="hidden" name="ruleId" value={rule.id} /><input type="hidden" name="status" value="withdrawn" /><button className="save-button" type="submit">Withdraw</button></form>
              </>
            )}
            {rule.verification_status === "stale" && roles.some((role) => role === "reviewer" || role === "admin") && (
              <form action={changeRuleStatus}>
                <input type="hidden" name="ruleId" value={rule.id} />
                <input type="hidden" name="status" value="pending_review" />
                <button className="save-button" type="submit">Reopen for review</button>
              </form>
            )}
          </article>
        ))}
        {(rules ?? []).length === 0 && <p>No rules are waiting for review or publication.</p>}
      </div>
    </>
  );
}
