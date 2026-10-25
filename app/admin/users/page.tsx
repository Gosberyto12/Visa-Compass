import { getEditorialAuthorization } from "@/lib/supabase/authorization";

export default async function AdminUsersPage() {
  const authorization = await getEditorialAuthorization(["admin"]);
  if (authorization.status !== "authorized") return <p>Administrator access is required.</p>;

  return (
    <>
      <p className="section-kicker">USER MANAGEMENT</p>
      <h1>Account operations</h1>
      <p>This application does not expose a user directory or permit staff to impersonate users. Use the protected Supabase Auth dashboard for account support, with least-privilege operator access.</p>
      <div className="result-limitations">
        <h2>Deletion</h2>
        <p>Users can delete their own account from dashboard settings when the server-only service-role key is configured. Auth deletion cascades to saved trips and checklists. Do not copy that key into a browser environment variable.</p>
        <h2>Role provisioning</h2>
        <p>Admin, reviewer and publisher assignments are managed out-of-band in the private role table. No self-service role assignment endpoint exists.</p>
      </div>
    </>
  );
}
