import { createSupabaseServerClient } from "./server";

export type EditorialRole = "admin" | "reviewer" | "publisher";

export type EditorialAuthorization =
  | { status: "not_configured" }
  | { status: "anonymous" }
  | { status: "forbidden" }
  | {
      status: "authorized";
      supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
      userId: string;
      roles: EditorialRole[];
    };

export async function getEditorialAuthorization(
  allowedRoles: EditorialRole[]
): Promise<EditorialAuthorization> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "not_configured" };

  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error("Unable to confirm admin access.");
  if (!data.user) return { status: "anonymous" };

  const roleChecks = await Promise.all(
    allowedRoles.map(async (role) => {
      const result = await supabase.rpc("has_role", { required_role: role });
      if (result.error) throw new Error("Unable to verify editorial permissions.");
      return result.data ? role : null;
    })
  );
  const roles = roleChecks.filter((role): role is EditorialRole => role !== null);
  if (roles.length === 0) return { status: "forbidden" };
  return { status: "authorized", supabase, userId: data.user.id, roles };
}
