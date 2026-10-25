import { ContentPage } from "@/components/content-page";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <ContentPage eyebrow="SIMPLE, TRANSPARENT ACCESS" title="Free essentials. Premium tools later.">
      <div className="pricing-grid">
        <section className="feature-card">
          <h2>Free</h2>
          <p>Available to every visitor</p>
          <ul>
            <li>Basic visa searches</li>
            <li>Essential published entry information</li>
            <li>Official source and verification details</li>
            <li>Basic document-preparation guidance</li>
          </ul>
        </section>
        <section className="feature-card">
          <h2>Premium — not available yet</h2>
          <p>Planned organization tools; no charge or activation is enabled.</p>
          <ul>
            <li>Multiple saved trips</li>
            <li>Downloadable reports</li>
            <li>Configurable reminders</li>
            <li>Change alerts when reliable update monitoring is available</li>
          </ul>
        </section>
      </div>
      <p>VisaCompass does not currently process payments or activate paid subscriptions. Critical entry information will not be hidden behind a paid feature.</p>
    </ContentPage>
  );
}
