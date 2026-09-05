import { Schema, model, type InferSchemaType } from "mongoose";

const noteSchema = new Schema({ text: { type: String, required: true, maxlength: 2_000 }, createdAt: { type: Date, default: Date.now } }, { _id: true });
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  emailVerified: { type: Boolean, default: false },
  verificationTokenHash: { type: String, select: false },
  verificationTokenExpiresAt: { type: Date, select: false },
  name: { type: String, trim: true, maxlength: 80, default: "" },
  avatarUrl: { type: String, maxlength: 2_000, default: "" },
  notes: { type: [noteSchema], default: [] },
  plan: { type: String, enum: ["free", "premium"], default: "free", index: true },
}, { timestamps: true });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
