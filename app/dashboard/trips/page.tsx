import Link from "next/link";
import { redirect } from "next/navigation";
import { addChecklistItem, createSavedTrip, toggleChecklistItem, updateChecklistNotes } from "@/app/dashboard/actions";
import { countries } from "@/lib/sample-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TripsPage() {
  if (!isSupabaseConfigured()) {
    return <main className="simple-page"><section className="simple-card"><h1>Saved trips are unavailable</h1><p>Configure Supabase to enable private trip storage.</p><Link href="/dashboard">Return to dashboard</Link></section></main>;
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error("Unable to authenticate for saved trips.");
  if (!user) redirect("/login");

  const { data: trips, error } = await supabase
    .from("saved_trips")
    .select("id, arrival_date, departure_date, travel_purpose, trip_status, origin_country_id, destination_country_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load your saved trips.");

  const tripIds = (trips ?? []).map((trip) => trip.id);
  const { data: checklistItems, error: checklistError } = tripIds.length
    ? await supabase.from("trip_checklists").select("id, saved_trip_id, item_name, description, personal_notes, is_complete").in("saved_trip_id", tripIds)
    : { data: [], error: null };
  if (checklistError) throw new Error("Unable to load your saved checklists.");
  const { data: countryRows, error: countryError } = await supabase.from("countries").select("id, iso2, common_name");
  if (countryError) throw new Error("Unable to load country names.");
  const countryName = new Map((countryRows ?? []).map((country) => [country.id, country.common_name]));

  return (
    <main className="simple-page">
      <section className="simple-card wide-card">
        <Link className="simple-brand" href="/dashboard">VisaCompass · Dashboard</Link>
        <p className="section-kicker">YOUR PLANS</p>
        <h1>Saved trips</h1>
        <p>Trip plans and checklist notes are private to your account.</p>
        <form className="simple-form trip-form" action={createSavedTrip}>
          <label>Passport nationality<select name="originCountry" required>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
          <label>Destination<select name="destinationCountry" required>{countries.filter((country) => country.code !== "TZ").map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
          <label>Travel purpose<select name="purpose" required><option value="tourism">Tourism</option><option value="business">Business</option><option value="transit">Transit</option><option value="study">Study</option><option value="work">Work</option><option value="family_visit">Family visit</option><option value="other">Other</option></select></label>
          <label>Passport type<select name="passportType" required><option value="ordinary">Ordinary passport</option><option value="diplomatic">Diplomatic passport</option><option value="official">Official passport</option><option value="other">Other document</option></select></label>
          <label>Arrival date<input name="arrivalDate" type="date" required /></label>
          <label>Departure date (optional)<input name="departureDate" type="date" /></label>
          <button className="search-button" type="submit">Save trip</button>
        </form>
        <div className="saved-trip-list">
          {(trips ?? []).length === 0 && <p>No trips saved yet.</p>}
          {(trips ?? []).map((trip) => (
            <article className="saved-trip" key={trip.id}>
              <h2>{countryName.get(trip.origin_country_id) ?? "Passport"} → {countryName.get(trip.destination_country_id) ?? "Destination"}</h2>
              <p>{trip.travel_purpose.replaceAll("_", " ")} · {trip.arrival_date}{trip.departure_date ? ` to ${trip.departure_date}` : ""}</p>
              <h3>Preparation checklist</h3>
              <ul className="checklist-items">
                {(checklistItems ?? []).filter((item) => item.saved_trip_id === trip.id).map((item) => (
                  <li key={item.id}>
                    <span>{item.is_complete ? "✓" : "○"} {item.item_name}{item.description ? ` — ${item.description}` : ""}{item.personal_notes ? ` · Note: ${item.personal_notes}` : ""}</span>
                    <form action={toggleChecklistItem}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="complete" value={String(!item.is_complete)} />
                      <button className="save-button" type="submit">{item.is_complete ? "Reopen" : "Mark done"}</button>
                    </form>
                  </li>
                ))}
              </ul>
              {(checklistItems ?? []).filter((item) => item.saved_trip_id === trip.id).map((item) => (
                <form className="simple-form checklist-form" action={updateChecklistNotes} key={`notes-${item.id}`}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <label>Personal note for {item.item_name}<input name="personalNotes" type="text" maxLength={1000} defaultValue={item.personal_notes ?? ""} /></label>
                  <button className="save-button" type="submit">Save note</button>
                </form>
              ))}
              <form className="simple-form checklist-form" action={addChecklistItem}>
                <input type="hidden" name="savedTripId" value={trip.id} />
                <label>Checklist item<input name="itemName" type="text" maxLength={200} required /></label>
                <label>Personal note (optional)<input name="personalNotes" type="text" maxLength={1000} /></label>
                <button className="save-button" type="submit">Add item</button>
              </form>
            </article>
          ))}
        </div>
        <Link href="/dashboard">Return to dashboard</Link>
      </section>
    </main>
  );
}
