import { Types } from "mongoose";
import { Entitlement, type EntitlementKey } from "../models/Entitlement.js";

export async function hasActiveEntitlement(userId: string, key: EntitlementKey) {
  const now = new Date();
  return Boolean(await Entitlement.exists({
    user: new Types.ObjectId(userId),
    key,
    startsAt: { $lte: now },
    revokedAt: { $exists: false },
    $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }],
  }));
}

export async function canAccessContent(userId: string, access: "free" | "premium") {
  return access === "free" || hasActiveEntitlement(userId, "premium");
}
