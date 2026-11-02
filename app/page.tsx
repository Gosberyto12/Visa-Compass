"use client";

import { useState } from "react";
import Link from "next/link";
import { africanCountries, countries } from "@/lib/sample-data";
import type { VisaResult } from "@/lib/visa-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSafeExternalUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isVisaResult(value: unknown): value is VisaResult & { requestId: string } {
  if (!isRecord(value)) return false;
  const result = value;
  const allowedPathways = ["visa_free", "visa_on_arrival", "evisa", "visa_required", "eta", "transit_visa", "unknown"];
  const allowedSources = ["official", "licensed_provider", "other"];
  return (
    typeof result.requestId === "string" &&
    /^[0-9a-f-]{36}$/i.test(result.requestId) &&
    ["verified", "unverified", "conflicted"].includes(String(result.assessmentStatus)) &&
    allowedPathways.includes(String(result.entryPathway)) &&
    typeof result.summary === "string" &&
    Array.isArray(result.eligibilityConditions) &&
    result.eligibilityConditions.every((condition) => typeof condition === "string") &&
    Array.isArray(result.requirements) &&
    result.requirements.every((requirement) =>
      isRecord(requirement) &&
      typeof requirement.category === "string" &&
      typeof requirement.description === "string" &&
      typeof requirement.verified === "boolean" &&
      (requirement.isMandatory === null || typeof requirement.isMandatory === "boolean")
    ) &&
    Array.isArray(result.sources) &&
    result.sources.every((source) =>
      isRecord(source) &&
      typeof source.name === "string" &&
      isSafeExternalUrl(source.url) &&
      allowedSources.includes(String(source.sourceType))
    ) &&
    Array.isArray(result.limitations) &&
    result.limitations.every((limitation) => typeof limitation === "string") &&
    ["mock", "sherpa", "database"].includes(String(result.provider)) &&
    typeof result.isMock === "boolean" &&
    typeof result.confirmationRequired === "boolean" &&
    typeof result.disclaimer === "string" &&
    (result.maximumStayDays === null || typeof result.maximumStayDays === "number") &&
    (result.applicationUrl === null || isSafeExternalUrl(result.applicationUrl)) &&
    (result.processingInformation === null || typeof result.processingInformation === "string") &&
    (result.lastVerifiedAt === null || typeof result.lastVerifiedAt === "string") &&
    ["current", "stale", "unknown"].includes(String(result.dataFreshness)) &&
    (result.fees === null ||
      (isRecord(result.fees) &&
        typeof result.fees.amount === "number" &&
        Number.isFinite(result.fees.amount) &&
        result.fees.amount >= 0 &&
        typeof result.fees.currency === "string" &&
        /^[A-Z]{3}$/.test(result.fees.currency)))
  );
}

function displayPathway(pathway: VisaResult["entryPathway"]): string {
  return pathway.replaceAll("_", " ");
}

export default function Home() {
  const [passportCountry, setPassportCountry] = useState("TZ");
  const [destinationCountry, setDestinationCountry] = useState("KE");
  const [purpose, setPurpose] = useState("tourism");
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [passportType, setPassportType] = useState("ordinary");
  const [result, setResult] = useState<(VisaResult & { requestId: string }) | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/visa-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passportCountry,
          destinationCountry,
          purpose,
          arrivalDate,
          ...(departureDate ? { departureDate } : {}),
          passportType,
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const errorPayload =
          payload && typeof payload === "object" && "error" in payload
            ? (payload as { error?: { message?: unknown } }).error
            : undefined;
        throw new Error(
          typeof errorPayload?.message === "string"
            ? errorPayload.message
            : "The search could not be completed. Please try again."
        );
      }
      if (!isVisaResult(payload)) {
        throw new Error("The search returned an unexpected response. Please try again.");
      }
      setResult(payload);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "The search could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  const selectedPassport = countries.find((country) => country.code === passportCountry)?.name ?? passportCountry;
  const selectedDestination =
    countries.find((country) => country.code === destinationCountry)?.name ?? destinationCountry;
  const needsConfirmation =
    result &&
    (result.isMock ||
      result.assessmentStatus !== "verified" ||
      result.entryPathway === "unknown" ||
      result.dataFreshness !== "current" ||
      result.confirmationRequired);

  return (
    <main>
      <div className="announcement">
        <span className="announcement-dot" />
        Your next journey starts with the right information
      </div>

      <header className="nav wrap">
        <Link className="brand" href="/" aria-label="VisaCompassAfrica home">
          <span className="brand-mark">✦</span>
          <span>Visa<span className="brand-light">CompassAfrica</span></span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#explore">Explore</a>
          <a className="nav-cta" href="#checker">Check requirements <span>↗</span></a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-glow glow-one" />
        <div className="hero-glow glow-two" />
        <div className="hero-content wrap">
          <div className="eyebrow"><span>✦</span> TRAVEL SMARTER. TRAVEL PREPARED.</div>
          <h1>Go further.<br /><em>Worry less.</em></h1>
          <p className="hero-copy">
            Clear visa guidance for wherever life takes you.
            Understand entry requirements, prepare your documents,
            and start your journey with confidence.
          </p>
          <div className="hero-points">
            <span><b>✓</b> Passport-specific searches</span>
            <span><b>✓</b> Source and verification details</span>
            <span><b>✓</b> Uncertainty made clear</span>
          </div>
          <div className="hero-stamp">
            <span className="stamp-icon">◎</span>
            <span><strong>Your world, more accessible.</strong><small>One destination at a time.</small></span>
          </div>
        </div>
        <div className="hero-orbit orbit-a" />
        <div className="hero-orbit orbit-b" />
        <div className="hero-globe"><span>✦</span><i>◌</i></div>
      </section>

      <section className="checker-section wrap" id="checker">
        <div className="section-kicker">START YOUR JOURNEY</div>
        <div className="checker-heading">
          <div>
            <h2>Where are you headed?</h2>
            <p>Search by passport nationality, destination and travel dates.</p>
          </div>
          <span className="secure-pill"><span>●</span> Basic search is free</span>
        </div>

        <form className="search-card" onSubmit={submitSearch}>
          <label className="field">
            <span className="field-label">PASSPORT NATIONALITY</span>
            <select
              value={passportCountry}
              onChange={(event) => {
                const nextPassport = event.target.value;
                setPassportCountry(nextPassport);
                if (nextPassport === destinationCountry) {
                  setDestinationCountry(countries.find((country) => country.code !== nextPassport)?.code ?? "");
                }
              }}
              required
            >
              {africanCountries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select>
            <small>Select the country that issued your passport.</small>
          </label>
          <label className="field">
            <span className="field-label">DESTINATION</span>
            <select
              value={destinationCountry}
              onChange={(event) => setDestinationCountry(event.target.value)}
              required
            >
              {countries.filter((country) => country.code !== passportCountry).map((country) => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
            <small>The country you plan to visit.</small>
          </label>
          <label className="field">
            <span className="field-label">TRAVEL PURPOSE</span>
            <select value={purpose} onChange={(event) => setPurpose(event.target.value)} required>
              <option value="tourism">Tourism</option>
              <option value="business">Business</option>
              <option value="transit">Transit</option>
              <option value="study">Study</option>
              <option value="work">Work</option>
              <option value="family_visit">Family visit</option>
              <option value="other">Other</option>
            </select>
            <small>Choose the primary purpose of travel.</small>
          </label>
          <label className="field">
            <span className="field-label">PLANNED DEPARTURE FROM YOUR COUNTRY</span>
            <input
              type="date"
              value={departureDate}
              onChange={(event) => setDepartureDate(event.target.value)}
              max={arrivalDate || undefined}
            />
            <small>When you leave your country of departure. Optional if unknown.</small>
          </label>
          <label className="field">
            <span className="field-label">PLANNED ARRIVAL IN {selectedDestination.toUpperCase()}</span>
            <input
              type="date"
              value={arrivalDate}
              onChange={(event) => setArrivalDate(event.target.value)}
              min={departureDate || undefined}
              required
            />
            <small>When you expect to enter your destination.</small>
          </label>
          <label className="field">
            <span className="field-label">PASSPORT TYPE</span>
            <select value={passportType} onChange={(event) => setPassportType(event.target.value)} required>
              <option value="ordinary">Ordinary passport</option>
              <option value="diplomatic">Diplomatic passport</option>
              <option value="official">Official passport</option>
              <option value="other">Other travel document</option>
            </select>
            <small>Rules may vary by travel-document type.</small>
          </label>
          <button className="search-button" type="submit" disabled={loading}>
            {loading ? "Checking..." : "Explore requirements"} <span>↗</span>
          </button>
        </form>

        {error && <p className="search-error" role="alert">{error}</p>}

        {result && (
          <section className="result-card" aria-live="polite" aria-labelledby="result-heading">
            <div className="result-top">
              <div>
                <div className="section-kicker">YOUR TRAVEL ASSESSMENT</div>
                <h3 id="result-heading">{selectedPassport} <span className="result-arrow">→</span> {selectedDestination}</h3>
                <p className="result-subtitle">
                  {purpose.replaceAll("_", " ")} ·
                  {departureDate ? ` Departure ${departureDate} ·` : ""} Arrival {arrivalDate}
                </p>
              </div>
              <span className="status-badge">
                {result.assessmentStatus === "conflicted"
                  ? "Conflicting sources"
                  : result.dataFreshness === "stale"
                    ? "Review is overdue"
                    : result.assessmentStatus === "verified" && result.entryPathway !== "unknown"
                      ? "Source-verified information"
                      : "Confirmation required"}
              </span>
            </div>
            {needsConfirmation && (
              <div className="demo-warning" role="status">
                <strong>{result.isMock ? "Demonstration response — not travel advice." : "Information not verified."}</strong>
                This result does not establish your visa eligibility. Confirm current requirements with the destination&apos;s official immigration authority.
              </div>
            )}
            <p>{result.summary}</p>
            <div className="result-grid">
              <div className="result-item"><span>ENTRY PATHWAY</span><strong>{displayPathway(result.entryPathway)}</strong></div>
              <div className="result-item"><span>MAXIMUM STAY</span><strong>{result.maximumStayDays === null ? "Information not verified" : `${result.maximumStayDays} days`}</strong></div>
              <div className="result-item"><span>LAST VERIFIED</span><strong>{result.lastVerifiedAt ?? "Information not verified"}</strong></div>
            </div>
            <div className="result-grid">
              <div className="result-item"><span>FEE</span><strong>{result.fees ? `${result.fees.amount} ${result.fees.currency}` : "Information not verified"}</strong></div>
              <div className="result-item"><span>PROCESSING INFORMATION</span><strong>{result.processingInformation ?? "Information not verified"}</strong></div>
              <div className="result-item"><span>ASSESSMENT</span><strong>{result.assessmentStatus}</strong></div>
            </div>
            {result.eligibilityConditions.length > 0 && (
              <>
                <h4>Eligibility conditions</h4>
                <ul className="doc-list">
                  {result.eligibilityConditions.map((condition) => <li key={condition}>{condition}</li>)}
                </ul>
              </>
            )}
            <h4>Requirements and documents</h4>
            {result.requirements.length ? (
              <ul className="doc-list">
                {result.requirements.map((item, index) => (
                  <li key={`${item.category}-${index}`}>
                    <span>{item.verified ? "✓" : "!"}</span>
                  <span><strong>{item.category}:</strong> {item.description} — {item.isMandatory === null ? "requirement status not verified" : item.isMandatory ? "required" : "optional"}{!item.verified ? " (not verified)" : ""}</span>
                  </li>
                ))}
              </ul>
            ) : <p>Information not verified. No requirements are provided by this response.</p>}
            {result.sources.length > 0 && (
              <>
                <h4>Sources</h4>
                <ul className="doc-list">
                  {result.sources.map((source) => (
                    <li key={`${source.name}-${source.url}`}>
                      <a className="official-link" href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.name} · {source.sourceType.replaceAll("_", " ")} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {result.applicationUrl && (
              <p><a className="official-link" href={result.applicationUrl} target="_blank" rel="noopener noreferrer">Application information ↗</a></p>
            )}
            {result.limitations.length > 0 && (
              <div className="result-limitations">
                <h4>Limitations</h4>
                <ul>{result.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
              </div>
            )}
            <p className="save-note">{result.disclaimer} Reference: {result.requestId}</p>
          </section>
        )}
      </section>

      <section className="features-section" id="how-it-works">
        <div className="wrap">
          <div className="section-kicker">YOUR TRAVEL TOOLKIT</div>
          <div className="feature-heading">
            <h2>Confidence, before<br />you <em>take off.</em></h2>
            <p>Travel planning can be complicated. We make the information you need easier to understand and act on.</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon mint">⌕</div>
              <span className="feature-number">01 / DISCOVER</span>
              <h3>Know your requirements</h3>
              <p>Search by passport, destination, purpose, document type and intended travel dates.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon peach">▤</div>
              <span className="feature-number">02 / PREPARE</span>
              <h3>Get document-ready</h3>
              <p>Review requirements and uncertainty before preparing for your journey.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon lilac">↗</div>
              <span className="feature-number">03 / TAKE ACTION</span>
              <h3>Go to trusted sources</h3>
              <p>Use source references and official guidance instead of relying on guesswork.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="explore-section wrap" id="explore">
        <div>
          <div className="section-kicker">BUILT WITH AFRICA IN MIND</div>
          <h2>Start local.<br /><em>Think global.</em></h2>
          <p>Coverage will grow as reliable source-backed information is reviewed. The included development provider does not make real visa determinations.</p>
        </div>
        <div className="region-panel">
          <div className="region-row"><span className="region-emoji">🌍</span><span><strong>Initial focus</strong><small>Tanzania, Kenya, Uganda and Rwanda</small></span><span className="region-arrow">↗</span></div>
          <div className="region-row"><span className="region-emoji">✈️</span><span><strong>Worldwide routes</strong><small>Coverage depends on verified data availability</small></span><span className="region-arrow">↗</span></div>
          <div className="region-row"><span className="region-emoji">🛡️</span><span><strong>Source-led information</strong><small>Unverified information is identified clearly</small></span><span className="region-arrow">↗</span></div>
          <div className="region-note">VisaCompassAfrica is not a government authority and cannot guarantee admission.</div>
        </div>
      </section>

      <section className="cta-section">
        <div className="wrap cta-inner">
          <div><div className="section-kicker">THE WORLD IS WAITING</div><h2>Your next trip starts<br />with <em>knowing.</em></h2></div>
          <a className="cta-button" href="#checker">Check a destination <span>↗</span></a>
        </div>
      </section>

      <footer className="footer wrap">
        <Link className="brand" href="/" aria-label="VisaCompassAfrica home"><span className="brand-mark">✦</span><span>Visa<span className="brand-light">CompassAfrica</span></span></Link>
        <p>Travel better informed. Arrive better prepared.</p>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link href="/about">About</Link><Link href="/pricing">Pricing</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link><Link href="/countries">Countries</Link>
        </nav>
        <small>Visa information can change. Always confirm with official authorities.</small>
      </footer>
    </main>
  );
}
