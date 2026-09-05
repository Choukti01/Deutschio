import { Router } from "express";
import { z } from "zod";
import { ExerciseAttempt } from "../models/ExerciseAttempt.js";
import { Lesson } from "../models/Lesson.js";
import { LessonProgress } from "../models/LessonProgress.js";
import { requireAuth, requireCsrf, type AuthenticatedRequest } from "../middleware/auth.js";
import { canAccessContent } from "../services/access.js";
import { learnerLesson } from "../services/serializers.js";

const slugSchema = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/).max(100) });
const attemptSchema = z.object({ exerciseId: z.string().min(1).max(100), answer: z.string().trim().min(1).max(500) });
const checkpointSchema = z.object({ lastBlockIndex: z.coerce.number().int().min(0) });
const normalize = (value: string) => value.trim().toLocaleLowerCase("de-DE");

export const lessonsRouter = Router();

lessonsRouter.get("/:slug", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { slug } = slugSchema.parse(req.params);
    const lesson = await Lesson.findOne({ slug, published: true });
    if (!lesson) return res.status(404).json({ error: { code: "LESSON_NOT_FOUND", message: "Lesson not found" } });
    if (!await canAccessContent(req.userId!, lesson.access)) return res.status(403).json({ error: { code: "PREMIUM_REQUIRED", message: "This lesson requires Premium" } });
    return res.json({ lesson: learnerLesson(lesson) });
  } catch (error) { next(error); }
});

lessonsRouter.post("/:slug/attempts", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { slug } = slugSchema.parse(req.params);
    const input = attemptSchema.parse(req.body);
    const lesson = await Lesson.findOne({ slug, published: true }).select("+exercises.answer");
    if (!lesson) return res.status(404).json({ error: { code: "LESSON_NOT_FOUND", message: "Lesson not found" } });
    if (!await canAccessContent(req.userId!, lesson.access)) return res.status(403).json({ error: { code: "PREMIUM_REQUIRED", message: "This lesson requires Premium" } });
    const exercise = lesson.exercises.find((candidate) => candidate.id === input.exerciseId);
    if (!exercise) return res.status(404).json({ error: { code: "EXERCISE_NOT_FOUND", message: "Exercise not found" } });
    const correct = normalize(input.answer) === normalize(exercise.answer);
    const score = correct ? exercise.points : 0;
    await ExerciseAttempt.create({ user: req.userId, lesson: lesson._id, exerciseId: exercise.id, answer: input.answer, correct, score });
    const progressUpdate = correct
      ? { status: "completed" as const, completedAt: new Date(), lastActivityAt: new Date() }
      : { status: "in_progress" as const, lastActivityAt: new Date() };
    const progress = await LessonProgress.findOneAndUpdate(
      { user: req.userId, lesson: lesson._id },
      { $set: progressUpdate, $max: { bestScore: score }, $setOnInsert: { lastBlockIndex: 0 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.status(201).json({ result: { correct, score, explanation: exercise.explanation }, progress: { status: progress.status, bestScore: progress.bestScore, completedAt: progress.completedAt } });
  } catch (error) { next(error); }
});

lessonsRouter.patch("/:slug/progress", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { slug } = slugSchema.parse(req.params);
    const input = checkpointSchema.parse(req.body);
    const lesson = await Lesson.findOne({ slug, published: true });
    if (!lesson) return res.status(404).json({ error: { code: "LESSON_NOT_FOUND", message: "Lesson not found" } });
    if (!await canAccessContent(req.userId!, lesson.access)) return res.status(403).json({ error: { code: "PREMIUM_REQUIRED", message: "This lesson requires Premium" } });
    if (input.lastBlockIndex >= Math.max(lesson.blocks.length, 1)) return res.status(400).json({ error: { code: "INVALID_CHECKPOINT", message: "Checkpoint is outside this lesson" } });
    const progress = await LessonProgress.findOneAndUpdate(
      { user: req.userId, lesson: lesson._id },
      { $set: { lastBlockIndex: input.lastBlockIndex, lastActivityAt: new Date() }, $setOnInsert: { status: "in_progress", bestScore: 0 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.json({ progress: { status: progress.status, lastBlockIndex: progress.lastBlockIndex, bestScore: progress.bestScore } });
  } catch (error) { next(error); }
});
