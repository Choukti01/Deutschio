import { Schema, Types, model } from "mongoose";

export type ProgressStatus = "not_started" | "in_progress" | "completed";

export interface LessonProgressDocument {
  user: Types.ObjectId;
  lesson: Types.ObjectId;
  status: ProgressStatus;
  lastBlockIndex: number;
  bestScore: number;
  completedAt?: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const lessonProgressSchema = new Schema<LessonProgressDocument>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lesson: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
  status: { type: String, enum: ["not_started", "in_progress", "completed"], default: "not_started" },
  lastBlockIndex: { type: Number, default: 0, min: 0 },
  bestScore: { type: Number, default: 0, min: 0 },
  completedAt: Date,
  lastActivityAt: { type: Date, default: Date.now },
}, { timestamps: true });

lessonProgressSchema.index({ user: 1, lesson: 1 }, { unique: true });

export const LessonProgress = model<LessonProgressDocument>("LessonProgress", lessonProgressSchema);
