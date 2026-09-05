import { Schema, Types, model } from "mongoose";

export type EntitlementKey = "premium";
export type EntitlementSource = "manual" | "trial" | "subscription";

export interface EntitlementDocument {
  user: Types.ObjectId;
  key: EntitlementKey;
  source: EntitlementSource;
  startsAt: Date;
  endsAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const entitlementSchema = new Schema<EntitlementDocument>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  key: { type: String, enum: ["premium"], required: true, index: true },
  source: { type: String, enum: ["manual", "trial", "subscription"], required: true },
  startsAt: { type: Date, required: true, default: Date.now },
  endsAt: Date,
  revokedAt: Date,
}, { timestamps: true });

entitlementSchema.index({ user: 1, key: 1, startsAt: -1 });

export const Entitlement = model<EntitlementDocument>("Entitlement", entitlementSchema);
