import { Schema, Types, model } from "mongoose";

export interface SessionDocument {
  user: Types.ObjectId;
  tokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionDocument>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  csrfTokenHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: true },
  lastSeenAt: { type: Date, default: Date.now },
  revokedAt: Date,
}, { timestamps: true });

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = model<SessionDocument>("Session", sessionSchema);
