import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteAccount, updatePassword } from "@/app/auth/actions";
import { saveProfile } from "@/app/dashboard/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const messages: Record<string, string> = {
  password_too_short: "Use at least 10 characters for the new password.",
  password_update_failed: "Password update failed. Please try again.",
  deletion_confirmation: "Type DELETE exactly to confirm account removal.",
  deletion_not_configured: "Self-service deletion requires the server-only Supabase service-role key to be configured.",
  configuration: "Configure Supabase before changing account settings.",
};

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  if (!isSupabaseConfigured()) {
    return <main className="simple-page"><section className="simple-card"><h1>Settings unavailable</h1><p>Configure Supabase to manage account settings.</p><Link href="/dashboard">Return to dashboard</Link></section></main>;
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error("Unable to authenticate for account settings.");
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load your profile settings.");

  return (
    <main className="simple-page">
      <section className="simple-card">
        <Link className="simple-brand" href="/dashboard">VisaCompass · Dashboard</Link>
        <p className="section-kicker">ACCOUNT SETTINGS</p>
        <h1>Profile</h1>
        <p>Email: {user.email}</p>
        <form className="simple-form" action={saveProfile}>
          <label>Display name<input name="displayName" type="text" maxLength={100} defaultValue={profile?.display_name ?? ""} /></label>
          <button className="search-button" type="submit">Save profile</button>
        </form>
        <h2>Password</h2>
        {params.error && <p className="form-notice" role="alert">{messages[params.error] ?? "The requested settings change failed."}</p>}
        {params.message === "password_updated" && <p className="form-notice" role="status">Password updated.</p>}
        <form className="simple-form" action={updatePassword}>
          <label>New password<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
          <button className="save-button" type="submit">Update password</button>
        </form>
        <div className="result-limitations">
          <h2>Data and account deletion</h2>
          <p>Deletion removes your Supabase Auth account and cascades to its profile, trips, checklists, subscriptions and role assignments. The service-role key is only read by this server action and must never use a NEXT_PUBLIC_ name.</p>
          {process.env.SUPABASE_SERVICE_ROLE_KEY ? (
            <form className="simple-form" action={deleteAccount}>
              <label>Type DELETE to permanently remove this account<input name="confirmation" type="text" autoComplete="off" required /></label>
              <button className="save-button" type="submit">Delete account and saved data</button>
            </form>
          ) : <p>Self-service deletion is unavailable until SUPABASE_SERVICE_ROLE_KEY is configured server-side.</p>}
        </div>
        <Link href="/dashboard">Return to dashboard</Link>
      </section>
    </main>
  );
}
