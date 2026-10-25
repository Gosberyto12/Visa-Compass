import Link from "next/link";
import type { ReactNode } from "react";

export function ContentPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="simple-page">
      <article className="simple-card wide-card">
        <Link className="simple-brand" href="/">VisaCompass</Link>
        <p className="section-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        <div className="content-copy">{children}</div>
        <nav className="content-nav" aria-label="More VisaCompass pages">
          <Link href="/visa-check">Visa search</Link>
          <Link href="/countries">Countries</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </article>
    </main>
  );
}
