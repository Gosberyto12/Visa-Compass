"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveEntitlements } from "@/lib/entitlements";
import { isAfricanCountryCode, isCountryCode } from "@/lib/sample-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidDate } from "@/lib/validation";

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

  if (!isAfricanCountryCode(originCode) || !isCountryCode(destinationCode) || originCode === destinationCode) {
    throw new Error("Choose an African passport country and a different valid destination.");
  }
  if (!isValidDate(arrivalDate) ||
      (departureDate !== null && (!isValidDate(departureDate) || departureDate > arrivalDate))) {
    throw new Error("Enter valid travel dates; departure must be on or before arrival.");
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
  redirect("/dashboard/trips?error=trip_limit");
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
  try {
    const { supabase, user } = await getAuthenticatedClient();

    const displayName = text(formData, "displayName");

    console.log("PROFILE SAVE STARTED:", {
      userId: user.id,
      displayName,
    });

    if (displayName.length > 100) {
      redirect("/dashboard/settings?error=profile_update_failed");
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: displayName || null })
      .eq("id", user.id)
      .select("id, display_name");

    if (error) {
      console.error("PROFILE UPDATE ERROR:", error);
      redirect("/dashboard/settings?error=profile_update_failed");
    }

    if (!data || data.length === 0) {
      console.error("PROFILE UPDATE: No rows updated.");
      redirect("/dashboard/settings?error=profile_update_failed");
    }

    console.log("PROFILE UPDATE SUCCESS:", data);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    redirect("/dashboard/settings?message=profile_updated");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    console.error("PROFILE SAVE FAILED:", error);
    redirect("/dashboard/settings?error=profile_update_failed");
  }
}