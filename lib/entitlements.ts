export type EntitlementLevel = "free" | "premium";

export type UserEntitlements = {
  level: EntitlementLevel;
  canSaveMultipleTrips: boolean;
  canExportReports: boolean;
  canConfigureReminders: boolean;
};

export type SubscriptionRecord = {
  entitlement_level: string;
  subscription_status: string;
  current_period_end: string | null;
};

export function resolveEntitlements(
  subscription: SubscriptionRecord | null,
  now = Date.now()
): UserEntitlements {
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : Number.NaN;
  const premium =
    subscription?.entitlement_level === "premium" &&
    (subscription.subscription_status === "active" || subscription.subscription_status === "trialing") &&
    Number.isFinite(periodEnd) &&
    periodEnd > now;

  return {
    level: premium ? "premium" : "free",
    canSaveMultipleTrips: premium,
    canExportReports: premium,
    canConfigureReminders: premium,
  };
}
