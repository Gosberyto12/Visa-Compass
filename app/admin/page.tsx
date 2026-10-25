import { getEditorialAuthorization } from "@/lib/supabase/authorization";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const authorization = await getEditorialAuthorization(["admin", "reviewer", "publisher"]);
  if (authorization.status !== "authorized") return null;

  const { supabase, roles } = authorization;
  const [countries, rules, reviews, stale] = await Promise.all([
    supabase.from("countries").select("id", { count: "exact", head: true }),
    supabase.from("visa_rules").select("id", { count: "exact", head: true }),
    supabase.from("visa_rules").select("id", { count: "exact", head: true }).eq("verification_status", "pending_review"),
    supabase.from("visa_rules").select("id", { count: "exact", head: true }).eq("verification_status", "stale"),
  ]);
  if (countries.error || rules.error || reviews.error || stale.error) {
    throw new Error("Unable to load editorial data-quality indicators.");
  }

  const provider = process.env.VISA_PROVIDER?.toLowerCase() || "mock";
  return (
    <>
      <p className="section-kicker">EDITORIAL WORKSPACE</p>
      <h1>Admin overview</h1>
      <p>Only source-backed rules can be reviewed and published. Current app mode: <strong>{provider}</strong>.</p>
      <div className="admin-metrics">
        <div><strong>{countries.count ?? 0}</strong><span>Countries</span></div>
        <div><strong>{rules.count ?? 0}</strong><span>Visa rules</span></div>
        <div><strong>{reviews.count ?? 0}</strong><span>Pending review</span></div>
        <div><strong>{stale.count ?? 0}</strong><span>Stale rules</span></div>
      </div>
      <div className="result-limitations">
        <h2>Operational status</h2>
        <p>Live Sherpa calls remain disabled until the API contract and commercial authorization are approved. The default mock provider never makes visa determinations.</p>
        <p>Editorial roles are provisioned out-of-band. Users cannot grant themselves an administrative role through the application.</p>
        {roles.includes("admin") && <p>Administrator access is active. Review <Link href="/admin/sources">source records</Link> and <Link href="/admin/reviews">the verification queue</Link>.</p>}
      </div>
    </>
  );
}
