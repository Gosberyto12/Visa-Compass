import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const messages: Record<string, string> = {
  configuration: "Configure the Supabase project URL and public anon key before using accounts.",
  missing_fields: "Enter both your email address and password.",
  sign_in_failed: "Sign-in failed. Check your details and try again.",
  verification_failed: "Email verification could not be completed. Request a new verification email.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const notice = params.error
    ? messages[params.error]
    : params.message === "check_email"
      ? "Check your email to verify your account."
      : params.message === "account_deleted"
        ? "Your account and associated saved travel data were deleted."
        : "";
  const configured = isSupabaseConfigured();

  return (
    <main className="simple-page">
      <section className="simple-card">
        <Link className="simple-brand" href="/">VisaCompassAfrica</Link>
        <p className="section-kicker">WELCOME BACK</p>
        <h1>Sign in</h1>
        <p>Access your saved trips and checklists.</p>
        {!configured && (
          <div className="demo-warning" role="status">
            <strong>Accounts are not configured.</strong>
            Add the Supabase URL and public anon key from the project dashboard to your local environment.
          </div>
        )}
        {notice && <p className="form-notice" role="status">{notice}</p>}
        {configured && (
          <form className="simple-form" action={signIn}>
            <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
            <button className="search-button" type="submit">Sign in</button>
          </form>
        )}
        <p><Link href="/forgot-password">Forgot your password?</Link></p>
        <p>New to VisaCompassAfrica? <Link href="/register">Create an account</Link></p>
        <Link href="/">Return to search</Link>
      </section>
    </main>
  );
}
