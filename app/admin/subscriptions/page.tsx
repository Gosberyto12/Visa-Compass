import { getEditorialAuthorization } from "@/lib/supabase/authorization";

export default async function AdminSubscriptionsPage() {
  const authorization = await getEditorialAuthorization(["admin"]);
  if (authorization.status !== "authorized") return <p>Administrator access is required.</p>;
  const { data: subscriptions, error } = await authorization.supabase
    .from("subscriptions")
    .select("user_id, provider, subscription_status, entitlement_level, current_period_start, current_period_end, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Unable to load subscription support data.");

  return (
    <>
      <p className="section-kicker">SUBSCRIPTION SUPPORT</p>
      <h1>Subscription status</h1>
      <p>Entitlements are read-only here. No payment provider is configured and no client can write subscription status.</p>
      <div className="saved-trip-list">
        {(subscriptions ?? []).map((subscription) => (
          <article className="saved-trip" key={subscription.user_id}>
            <h2>{subscription.user_id}</h2>
            <p>{subscription.provider} · {subscription.subscription_status} · {subscription.entitlement_level}</p>
            <p>Billing period: {subscription.current_period_start ?? "not set"} – {subscription.current_period_end ?? "not set"}</p>
          </article>
        ))}
        {(subscriptions ?? []).length === 0 && <p>No subscription records. Free is the safe default.</p>}
      </div>
    </>
  );
}
