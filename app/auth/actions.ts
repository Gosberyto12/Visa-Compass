"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

export async function signIn(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=configuration");

  const email = formText(formData, "email");
  const password = formText(formData, "password");
  if (!email || !password) redirect("/login?error=missing_fields");


const { error } = await supabase.auth.signInWithPassword({ email, password });

if (error) {
  console.error("[VisaCompass Login Error]", {
    message: error.message,
    status: error.status,
    code: error.code,
  });

  redirect("/login?error=sign_in_failed");
}

redirect("/dashboard");
}
export async function signUp(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/register?error=configuration");

  const email = formText(formData, "email");
  const password = formText(formData, "password");
  const displayName = formText(formData, "displayName");
  if (!email || password.length < 10) redirect("/register?error=invalid_fields");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${getOrigin()}/auth/callback`,
    },
  });
  if (error) redirect("/register?error=registration_failed");
  if (data.session) redirect("/dashboard");
  redirect("/login?message=check_email");
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/forgot-password?error=configuration");

  const email = formText(formData, "email");
  if (!email) redirect("/forgot-password?error=missing_email");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getOrigin()}/auth/callback?next=/dashboard/settings`,
  });
  if (error) redirect("/forgot-password?error=reset_failed");
  redirect("/forgot-password?message=check_email");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error("Unable to sign out. Please try again.");
  }
  redirect("/login");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=configuration");
  const password = formText(formData, "password");
  if (password.length < 10) redirect("/dashboard/settings?error=password_too_short");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/dashboard/settings?error=password_update_failed");
  redirect("/dashboard/settings?message=password_updated");
}

export async function deleteAccount(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const config = getSupabasePublicConfig();
  if (!supabase || !config) redirect("/dashboard/settings?error=configuration");
  if (formText(formData, "confirmation") !== "DELETE") {
    redirect("/dashboard/settings?error=deletion_confirmation");
  }

  const { data, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error("Unable to confirm the account before deletion.");
  if (!data.user) redirect("/login");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) redirect("/dashboard/settings?error=deletion_not_configured");

  const adminClient = createClient(config.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await adminClient.auth.admin.deleteUser(data.user.id);
  if (error) throw new Error("Account deletion failed. Contact the configured account support channel.");
  redirect("/login?message=account_deleted");
}
