import { getEditorialAuthorization } from "@/lib/supabase/authorization";

export default async function AdminAuditPage() {
  const authorization = await getEditorialAuthorization(["admin"]);
  if (authorization.status !== "authorized") return <p>Administrator access is required.</p>;
  const { data: entries, error } = await authorization.supabase
    .from("admin_audit_logs")
    .select("id, actor_id, action, affected_table, affected_record_id, change_summary, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Unable to load the administrative audit log.");

  return (
    <>
      <p className="section-kicker">AUDIT HISTORY</p>
      <h1>Administrative audit log</h1>
      <p>Audit records are append-only to ordinary app roles. Retain and review them under the project&apos;s operational policy.</p>
      <div className="saved-trip-list">
        {(entries ?? []).map((entry) => (
          <article className="saved-trip" key={entry.id}>
            <h2>{entry.action} · {entry.affected_table}</h2>
            <p>{entry.created_at} · Actor {entry.actor_id ?? "system/deleted account"} · Record {entry.affected_record_id ?? "not available"}</p>
            <details><summary>Change record</summary><pre>{JSON.stringify(entry.change_summary, null, 2)}</pre></details>
          </article>
        ))}
        {(entries ?? []).length === 0 && <p>No administrative changes have been recorded.</p>}
      </div>
    </>
  );
}
