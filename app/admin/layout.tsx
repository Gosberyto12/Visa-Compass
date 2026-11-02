import Link from "next/link";
import { redirect } from "next/navigation";
import { getEditorialAuthorization } from "@/lib/supabase/authorization";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authorization = await getEditorialAuthorization(["admin", "reviewer", "publisher"]);
  if (authorization.status === "anonymous") redirect("/login");
  if (authorization.status === "not_configured") {
    return (
      <main className="simple-page"><section className="simple-card">
        <h1>Admin setup required</h1>
        <p>Configure Supabase, apply the migrations, and provision an authorized editorial role before using admin tools.</p>
        <Link href="/">Return to VisaCompassAfrica</Link>
      </section></main>
    );
  }
  if (authorization.status === "forbidden") {
    return (
      <main className="simple-page"><section className="simple-card">
        <h1>Access restricted</h1>
        <p>This area is limited to authorized reviewers, publishers and administrators.</p>
        <Link href="/">Return to VisaCompassAfrica</Link>
      </section></main>
    );
  }

  return (
    <main className="simple-page">
      <section className="simple-card wide-card admin-card">
        <Link className="simple-brand" href="/">VisaCompassAfrica · Admin</Link>
        <nav className="content-nav" aria-label="Admin navigation">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/visa-rules">Visa rules</Link>
          <Link href="/admin/reviews">Reviews</Link>
          <Link href="/admin/sources">Sources</Link>
          <Link href="/admin/subscriptions">Subscriptions</Link>
          <Link href="/admin/audit">Audit log</Link>
          <Link href="/admin/users">User management</Link>
          <Link href="/dashboard">User dashboard</Link>
        </nav>
        <p className="save-note">Your assigned roles: {authorization.roles.join(", ")}</p>
        {children}
      </section>
    </main>
  );
}
