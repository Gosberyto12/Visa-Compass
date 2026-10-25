import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { resolveEntitlements } from "@/lib/entitlements";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return <main className="simple-page"><section className="simple-card"><h1>Dashboard setup required</h1><p>Configure Supabase and apply the migrations to enable accounts and saved travel plans.</p><Link href="/">Return to search</Link></section></main>;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error("Unable to load your account.");
  if (!user) redirect("/login");

  const [profile, trips, subscription] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("saved_trips").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("subscriptions").select("entitlement_level, subscription_status, current_period_end").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profile.error || trips.error || subscription.error) throw new Error("Unable to load your saved travel dashboard.");
  const entitlements = resolveEntitlements(subscription.data);

  return (
    <main className="simple-page">
      <section className="simple-card dashboard-card">
        <Link className="simple-brand" href="/">VisaCompass</Link>
        <p className="section-kicker">YOUR TRAVEL SPACE</p>
        <h1>Hello{profile.data?.display_name ? `, ${profile.data.display_name}` : ""}</h1>
        <p>{user.email}</p>
        <div className="dashboard-links">
          <Link href="/dashboard/trips">Saved trips ({trips.count ?? 0})</Link>
          <Link href="/dashboard/settings">Profile and settings</Link>
        </div>
        <p className="save-note">Account tier: {entitlements.level}. Payment processing and premium activation are not enabled.</p>
        <form action={signOut}><button className="save-button" type="submit">Sign out</button></form>
        <p className="save-note">A saved checklist is a preparation aid; it does not guarantee visa approval or entry.</p>
      </section>
    </main>
  );
}
