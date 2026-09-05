import { Schema, Types, model } from "mongoose";

export interface EnrollmentDocument {
  user: Types.ObjectId;
  course: Types.ObjectId;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<EnrollmentDocument>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
}, { timestamps: true });

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

export const Enrollment = model<EnrollmentDocument>("Enrollment", enrollmentSchema);
