import { ContentPage } from "@/components/content-page";

export const metadata = { title: "About VisaCompass" };

export default function AboutPage() {
  return (
    <ContentPage eyebrow="ABOUT VISACOMPASS" title="Travel preparation starts with clarity">
      <p>VisaCompass is a travel-information and preparation service in development. It helps travellers organize passport-specific route information, source references and checklist tasks.</p>
      <p>It is not a visa issuer, immigration authority, legal adviser or representative of any government. It cannot guarantee visa approval or admission at a border.</p>
      <p>We aim to start with travellers holding Tanzanian, Kenyan, Ugandan and Rwandan passports. Coverage only becomes authoritative after a rule is checked against documented sources and passes editorial review.</p>
      <p>No official partnership, provider coverage or live database connection is claimed by this starter.</p>
    </ContentPage>
  );
}
