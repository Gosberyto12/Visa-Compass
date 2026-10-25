import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { countries } from "@/lib/sample-data";

export default function CountriesPage() {
  return (
    <ContentPage eyebrow="COUNTRY DIRECTORY" title="Explore country information">
      <p>The country list supports passport and destination selection. A listed country does not mean VisaCompass has verified route-specific entry rules.</p>
      <ul className="country-list">
        {countries.map((country) => (
          <li key={country.code}>
            <Link href={`/countries/${country.code.toLowerCase()}`}>{country.name}</Link>
            <span>{country.code}</span>
          </li>
        ))}
      </ul>
      <p className="save-note">Initial market focus: Tanzania, Kenya, Uganda and Rwanda. Route coverage depends on reviewed source data.</p>
    </ContentPage>
  );
}
