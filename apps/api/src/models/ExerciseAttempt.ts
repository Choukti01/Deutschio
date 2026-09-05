import { Schema, Types, model } from "mongoose";

export interface ExerciseAttemptDocument {
  user: Types.ObjectId;
  lesson: Types.ObjectId;
  exerciseId: string;
  answer: string;
  correct: boolean;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const exerciseAttemptSchema = new Schema<ExerciseAttemptDocument>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lesson: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
  exerciseId: { type: String, required: true, maxlength: 100 },
  answer: { type: String, required: true, maxlength: 500 },
  correct: { type: Boolean, required: true },
  score: { type: Number, required: true, min: 0 },
}, { timestamps: true });

exerciseAttemptSchema.index({ user: 1, lesson: 1, createdAt: -1 });

export const ExerciseAttempt = model<ExerciseAttemptDocument>("ExerciseAttempt", exerciseAttemptSchema);
