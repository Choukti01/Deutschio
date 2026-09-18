import { query } from "../db.js";

export type EntitlementKey = "premium";

export async function hasActiveEntitlement(userId: string, key: EntitlementKey) {
  const result = await query("SELECT 1 FROM entitlements WHERE user_id = $1 AND key = $2 AND starts_at <= now() AND revoked_at IS NULL AND (ends_at IS NULL OR ends_at > now()) LIMIT 1", [userId, key]);
  return Boolean(result.rowCount);
}

export async function canAccessContent(userId: string, access: "free" | "premium") {
  return access === "free" || hasActiveEntitlement(userId, "premium");
}
