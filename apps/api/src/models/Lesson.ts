import { Schema, Types, model } from "mongoose";
import type { CourseAccess } from "./Course.js";

export type LessonBlock = {
  type: "heading" | "paragraph" | "vocabulary";
  title?: string;
  text?: string;
  items?: Array<{ german: string; translation: string }>;
};

export type Exercise = {
  id: string;
  kind: "multiple_choice";
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  points: number;
};

export interface LessonDocument {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  slug: string;
  title: string;
  summary: string;
  position: number;
  access: CourseAccess;
  published: boolean;
  durationMinutes: number;
  blocks: LessonBlock[];
  exercises: Exercise[];
  createdAt: Date;
  updatedAt: Date;
}

const vocabularyItemSchema = new Schema({
  german: { type: String, required: true, trim: true, maxlength: 200 },
  translation: { type: String, required: true, trim: true, maxlength: 200 },
}, { _id: false });

const lessonBlockSchema = new Schema({
  type: { type: String, enum: ["heading", "paragraph", "vocabulary"], required: true },
  title: { type: String, trim: true, maxlength: 200 },
  text: { type: String, trim: true, maxlength: 10_000 },
  items: { type: [vocabularyItemSchema], default: undefined },
}, { _id: false });

const exerciseSchema = new Schema({
  id: { type: String, required: true, trim: true, maxlength: 100 },
  kind: { type: String, enum: ["multiple_choice"], required: true },
  prompt: { type: String, required: true, trim: true, maxlength: 1_000 },
  options: { type: [{ type: String, trim: true, maxlength: 500 }], required: true, validate: [(items: string[]) => items.length >= 2 && items.length <= 6, "Exercise needs two to six options"] },
  answer: { type: String, required: true, trim: true, maxlength: 500, select: false },
  explanation: { type: String, required: true, trim: true, maxlength: 2_000 },
  points: { type: Number, required: true, min: 1, max: 100 },
}, { _id: false });

const lessonSchema = new Schema<LessonDocument>({
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  summary: { type: String, required: true, trim: true, maxlength: 500 },
  position: { type: Number, required: true, min: 0 },
  access: { type: String, enum: ["free", "premium"], required: true },
  published: { type: Boolean, default: false, index: true },
  durationMinutes: { type: Number, required: true, min: 1, max: 180 },
  blocks: { type: [lessonBlockSchema], default: [] },
  exercises: { type: [exerciseSchema], default: [] },
}, { timestamps: true });

lessonSchema.index({ course: 1, position: 1 }, { unique: true });

export const Lesson = model<LessonDocument>("Lesson", lessonSchema);
