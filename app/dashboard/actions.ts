"use server";

import { revalidatePath } from "next/cache";
import { resolveEntitlements } from "@/lib/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error("Unable to confirm the signed-in user.");
  if (!data.user) throw new Error("Sign in before managing saved trips.");
  return { supabase, user: data.user };
}

export async function createSavedTrip(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const originCode = text(formData, "originCountry");
  const destinationCode = text(formData, "destinationCountry");
  const purpose = text(formData, "purpose");
  const passportType = text(formData, "passportType");
  const arrivalDate = text(formData, "arrivalDate");
  const departureDate = text(formData, "departureDate") || null;

  if (!/^[A-Z]{2}$/.test(originCode) || !/^[A-Z]{2}$/.test(destinationCode) || originCode === destinationCode) {
    throw new Error("Choose two different valid country codes.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arrivalDate) ||
      (departureDate !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || departureDate < arrivalDate))) {
    throw new Error("Enter valid travel dates.");
  }
  const purposes = ["tourism", "business", "transit", "study", "work", "family_visit", "other"];
  const passportTypes = ["ordinary", "diplomatic", "official", "other"];
  if (!purposes.includes(purpose) || !passportTypes.includes(passportType)) {
    throw new Error("Choose a supported travel purpose and passport type.");
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("entitlement_level, subscription_status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  if (subscriptionError) throw new Error("Unable to check subscription entitlements.");
  const entitlements = resolveEntitlements(subscription);
  if (!entitlements.canSaveMultipleTrips) {
    const { count, error } = await supabase
      .from("saved_trips")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (error) throw new Error("Unable to check your saved-trip limit.");
    if ((count ?? 0) >= 1) {
      throw new Error("Free accounts can save one trip. Multiple saved trips are a planned premium feature.");
    }
  }

  const [origin, destination] = await Promise.all([
    supabase.from("countries").select("id").eq("iso2", originCode).single(),
    supabase.from("countries").select("id").eq("iso2", destinationCode).single(),
  ]);
  if (origin.error || destination.error || !origin.data || !destination.data) {
    throw new Error("One or both selected countries are not in the configured country list.");
  }

  const { error } = await supabase.from("saved_trips").insert({
    user_id: user.id,
    origin_country_id: origin.data.id,
    destination_country_id: destination.data.id,
    travel_purpose: purpose,
    passport_type: passportType,
    arrival_date: arrivalDate,
    departure_date: departureDate,
  });
  if (error) throw new Error("Unable to save this trip. Check that the database is configured and try again.");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/trips");
}

export async function addChecklistItem(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const savedTripId = text(formData, "savedTripId");
  const itemName = text(formData, "itemName");
  const personalNotes = text(formData, "personalNotes");
  if (!/^[0-9a-f-]{36}$/i.test(savedTripId) || !itemName || itemName.length > 200 || personalNotes.length > 1000) {
    throw new Error("Enter a valid checklist item.");
  }

  const { error } = await supabase.from("trip_checklists").insert({
    saved_trip_id: savedTripId,
    item_name: itemName,
    personal_notes: personalNotes || null,
  });
  if (error) throw new Error("Unable to add the checklist item to this trip.");
  revalidatePath("/dashboard/trips");
}

export async function updateChecklistNotes(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const itemId = text(formData, "itemId");
  const personalNotes = text(formData, "personalNotes");
  if (!/^[0-9a-f-]{36}$/i.test(itemId) || personalNotes.length > 1000) {
    throw new Error("Enter a valid checklist note.");
  }
  const { data, error } = await supabase.from("trip_checklists")
    .update({ personal_notes: personalNotes || null })
    .eq("id", itemId)
    .select("id");
  if (error || !data?.length) throw new Error("Unable to update this checklist note.");
  revalidatePath("/dashboard/trips");
}

export async function toggleChecklistItem(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const itemId = text(formData, "itemId");
  const complete = formData.get("complete") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(itemId)) throw new Error("Invalid checklist item.");
  const { data, error } = await supabase.from("trip_checklists").update({ is_complete: complete }).eq("id", itemId).select("id");
  if (error || !data?.length) throw new Error("Unable to update the checklist item.");
  revalidatePath("/dashboard/trips");
}

export async function saveProfile(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const displayName = text(formData, "displayName");
  if (displayName.length > 100) throw new Error("Name must be 100 characters or fewer.");
  const { error } = await supabase.from("profiles").update({ display_name: displayName || null }).eq("id", user.id);
  if (error) throw new Error("Unable to save profile settings.");
  revalidatePath("/dashboard/settings");
}
