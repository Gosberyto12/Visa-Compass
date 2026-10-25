import { ContentPage } from "@/components/content-page";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <ContentPage eyebrow="PRIVACY" title="Privacy information">
      <p>This page is a product disclosure draft, not legal advice. Review and adapt it with qualified counsel before a public pilot.</p>
      <h2>Searches</h2>
      <p>Basic searches are sent to this application&apos;s server. The development mock provider does not request live provider data and the application does not need passport numbers or passport scans for a search.</p>
      <h2>Accounts and saved trips</h2>
      <p>When Supabase is configured, account details, saved route dates, profile name and checklist items are stored in the configured project. Row-level security policies are intended to restrict those records to the account owner.</p>
      <h2>Logging and providers</h2>
      <p>The search endpoint logs a request identifier and provider selection on provider failures, not the submitted passport/destination payload. Live Sherpa requests are disabled until contractual and technical approval.</p>
      <h2>Retention and requests</h2>
      <p>Self-service account deletion is available only when the server-only Supabase service-role key is configured. It deletes the auth account and cascades to associated profile/trip records. Data export, retention schedules and support handling still need to be defined before production.</p>
    </ContentPage>
  );
}
