import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content-page";
import { countries } from "@/lib/sample-data";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const country = countries.find((item) => item.code.toLowerCase() === code.toLowerCase());
  return { title: country ? country.name : "Country" };
}

export default async function CountryPage({ params }: Props) {
  const { code } = await params;
  const country = countries.find((item) => item.code.toLowerCase() === code.toLowerCase());
  if (!country) notFound();

  return (
    <ContentPage eyebrow="COUNTRY INFORMATION" title={country.name}>
      <p>Passport and destination selector entry for {country.name} ({country.code}). This directory entry is not a visa determination and does not indicate route coverage.</p>
      <div className="result-limitations">
        <h2>Visa-rule coverage</h2>
        <p>No route-specific rule is currently marked as verified in this starter. Check the destination authority&apos;s official information for current rules.</p>
      </div>
      <p><Link className="official-link" href="/visa-check">Search a route ↗</Link></p>
    </ContentPage>
  );
}
