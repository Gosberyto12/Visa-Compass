import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const messages: Record<string, string> = {
  configuration: "Configure Supabase before using password reset.",
  missing_email: "Enter your account email address.",
  reset_failed: "The reset request failed. Try again later.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="simple-page">
      <section className="simple-card">
        <Link className="simple-brand" href="/">VisaCompass</Link>
        <p className="section-kicker">ACCOUNT RECOVERY</p>
        <h1>Reset your password</h1>
        <p>We will send a reset link if the account can be recovered.</p>
        {params.error && <p className="form-notice" role="alert">{messages[params.error] ?? "Password reset could not be completed."}</p>}
        {params.message === "check_email" && <p className="form-notice" role="status">If the account exists, a password reset email has been sent.</p>}
        {isSupabaseConfigured() ? (
          <form className="simple-form" action={requestPasswordReset}>
            <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
            <button className="search-button" type="submit">Send reset link</button>
          </form>
        ) : <div className="demo-warning"><strong>Supabase setup required.</strong> Password recovery is unavailable until the project is configured.</div>}
        <Link href="/login">Return to sign in</Link>
      </section>
    </main>
  );
}
