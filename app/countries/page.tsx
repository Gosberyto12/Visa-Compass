import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { countries } from "@/lib/sample-data";

export default function CountriesPage() {
  return (
    <ContentPage eyebrow="COUNTRY DIRECTORY" title="Explore country information">
      <p>This directory lists countries and territories available for destination selection. Passport nationality is currently limited to African countries. A listed place does not mean VisaCompassAfrica has verified route-specific entry rules.</p>
      <ul className="country-list">
        {countries.map((country) => (
          <li key={country.code}>
            <Link href={`/countries/${country.code.toLowerCase()}`}>{country.name}</Link>
            <span>{country.code}</span>
          </li>
        ))}
      </ul>
      <p className="save-note">Passport nationality selection currently supports African countries. Route coverage depends on reviewed source data.</p>
    </ContentPage>
  );
}
