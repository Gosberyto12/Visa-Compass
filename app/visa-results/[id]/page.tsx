import Link from "next/link";
import { ContentPage } from "@/components/content-page";

export default function VisaResultPage() {
  return (
    <ContentPage eyebrow="SEARCH RESULTS" title="This result is not stored">
      <p>Search results are currently returned immediately and are not saved under a public or guessable URL. Run a new search to get the latest available response.</p>
      <p>Any mock response is unverified demonstration data, not travel advice.</p>
      <Link className="official-link" href="/visa-check">Start a visa search ↗</Link>
    </ContentPage>
  );
}
