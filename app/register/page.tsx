import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const messages: Record<string, string> = {
  configuration: "Configure the Supabase project URL and public anon key before creating accounts.",
  invalid_fields: "Enter a valid email and a password with at least 10 characters.",
  registration_failed: "Registration failed. Verify the details or try again later.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <main className="simple-page">
      <section className="simple-card">
        <Link className="simple-brand" href="/">VisaCompass</Link>
        <p className="section-kicker">CREATE YOUR ACCOUNT</p>
        <h1>Save your travel plans</h1>
        <p>Saved trips are private to your authenticated account.</p>
        {!configured && <div className="demo-warning"><strong>Supabase setup required.</strong> Account creation is not available until the project is configured.</div>}
        {params.error && <p className="form-notice" role="alert">{messages[params.error] ?? "Registration could not be completed."}</p>}
        {configured && (
          <form className="simple-form" action={signUp}>
            <label>Name (optional)<input name="displayName" type="text" autoComplete="name" maxLength={100} /></label>
            <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
            <small>Use at least 10 characters. Supabase email verification settings apply.</small>
            <button className="search-button" type="submit">Create account</button>
          </form>
        )}
        <p>Already have an account? <Link href="/login">Sign in</Link></p>
        <Link href="/">Return to search</Link>
      </section>
    </main>
  );
}
