import { ContentPage } from "@/components/content-page";

export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <ContentPage eyebrow="TERMS OF USE" title="Important information">
      <p>This draft should be reviewed by qualified counsel before public use.</p>
      <h2>Information service only</h2>
      <p>VisaCompass provides preparation information, not visas, legal advice, consular services or a guarantee of admission. Entry requirements can change and the final decision belongs to the relevant authorities.</p>
      <h2>Check official sources</h2>
      <p>Check the destination&apos;s official immigration or consular source before booking or travelling. Treat information labeled unverified, stale, incomplete or conflicting as requiring independent confirmation.</p>
      <h2>Provider data</h2>
      <p>Provider information may have contractual limits. No live provider integration is enabled in this starter without documented authorization.</p>
      <h2>Accounts and saved trips</h2>
      <p>Saved checklists are personal preparation aids and do not guarantee visa approval, boarding or admission.</p>
    </ContentPage>
  );
}
