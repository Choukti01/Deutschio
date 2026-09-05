import { Schema, model } from "mongoose";

export type CourseAccess = "free" | "premium";

export interface CourseDocument {
  slug: string;
  cefrLevel: "A1" | "A2" | "B1" | "B2";
  title: string;
  description: string;
  access: CourseAccess;
  published: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<CourseDocument>({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
  cefrLevel: { type: String, enum: ["A1", "A2", "B1", "B2"], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  access: { type: String, enum: ["free", "premium"], default: "free", index: true },
  published: { type: Boolean, default: false, index: true },
  position: { type: Number, required: true, min: 0 },
}, { timestamps: true });

courseSchema.index({ published: 1, position: 1 });

export const Course = model<CourseDocument>("Course", courseSchema);
