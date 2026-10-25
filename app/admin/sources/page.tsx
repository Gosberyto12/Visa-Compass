import { createDataSource } from "@/app/admin/actions";
import { getEditorialAuthorization } from "@/lib/supabase/authorization";

export default async function AdminSourcesPage() {
  const authorization = await getEditorialAuthorization(["admin", "reviewer"]);
  if (authorization.status !== "authorized") return <p>Reviewer or administrator access is required.</p>;
  const { data: sources, error } = await authorization.supabase
    .from("data_sources")
    .select("id, source_name, source_type, source_url, license_notes, may_display, may_store, may_cache, last_checked_at, next_review_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Unable to load source records.");

  return (
    <>
      <p className="section-kicker">SOURCE MANAGEMENT</p>
      <h1>Data sources</h1>
      <p>Record whether provider terms permit storing, displaying or caching data. Licensed source use is blocked from verification unless storage and display permissions are explicit.</p>
      <form className="simple-form trip-form admin-form" action={createDataSource}>
        <label>Source name<input name="sourceName" type="text" maxLength={200} required /></label>
        <label>Source type<select name="sourceType" required><option value="official">Official authority</option><option value="licensed_provider">Licensed provider</option><option value="other">Other</option></select></label>
        <label>HTTPS source URL<input name="sourceUrl" type="url" placeholder="https://" required /></label>
        <label>Last checked at (optional)<input name="lastCheckedAt" type="datetime-local" /></label>
        <label>Next review at (optional)<input name="nextReviewAt" type="datetime-local" /></label>
        <label>License / attribution notes<textarea name="licenseNotes" rows={3} maxLength={2000} /></label>
        <label className="checkbox-label"><input name="mayDisplay" type="checkbox" /> Permission to display</label>
        <label className="checkbox-label"><input name="mayStore" type="checkbox" /> Permission to store</label>
        <label className="checkbox-label"><input name="mayCache" type="checkbox" /> Permission to cache</label>
        <button className="search-button" type="submit">Add source</button>
      </form>
      <h2>Source register</h2>
      <div className="saved-trip-list">
        {(sources ?? []).map((source) => (
          <article className="saved-trip" key={source.id}>
            <h3>{source.source_name} · {source.source_type}</h3>
            <p><a className="official-link" href={source.source_url} target="_blank" rel="noopener noreferrer">{source.source_url} ↗</a></p>
            <p>Display: {source.may_display ? "permitted" : "not confirmed"} · Storage: {source.may_store ? "permitted" : "not confirmed"} · Cache: {source.may_cache ? "permitted" : "not confirmed"}</p>
            <p>Last checked: {source.last_checked_at ?? "not set"} · Next review: {source.next_review_at ?? "not set"}</p>
            {source.license_notes && <p>{source.license_notes}</p>}
          </article>
        ))}
        {(sources ?? []).length === 0 && <p>No source records yet.</p>}
      </div>
    </>
  );
}
