import { Router } from "express";
import { z } from "zod";
import { id, learnerLesson, query, type LessonRow } from "../db.js";
import { requireAuth, requireCsrf, type AuthenticatedRequest } from "../middleware/auth.js";
import { canAccessContent } from "../services/access.js";

const slugSchema = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/).max(100) });
const attemptSchema = z.object({ exerciseId: z.string().min(1).max(100), answer: z.string().trim().min(1).max(500) });
const checkpointSchema = z.object({ lastBlockIndex: z.coerce.number().int().min(0) });
const normalize = (value: string) => value.trim().toLocaleLowerCase("de-DE");
export const lessonsRouter = Router();

async function publishedLesson(slug: string) {
  return (await query<LessonRow>("SELECT id, course_id, slug, title, summary, position, access, published, duration_minutes, blocks, exercises FROM lessons WHERE slug = $1 AND published = true", [slug])).rows[0];
}

lessonsRouter.get("/:slug", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const lesson = await publishedLesson(slugSchema.parse(req.params).slug);
    if (!lesson) return res.status(404).json({ error: { code: "LESSON_NOT_FOUND", message: "Lesson not found" } });
    if (!await canAccessContent(req.userId!, lesson.access)) return res.status(403).json({ error: { code: "PREMIUM_REQUIRED", message: "This lesson requires Premium" } });
    return res.json({ lesson: learnerLesson(lesson) });
  } catch (error) { return next(error); }
});

lessonsRouter.post("/:slug/attempts", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try {
    const lesson = await publishedLesson(slugSchema.parse(req.params).slug);
    const input = attemptSchema.parse(req.body);
    if (!lesson) return res.status(404).json({ error: { code: "LESSON_NOT_FOUND", message: "Lesson not found" } });
    if (!await canAccessContent(req.userId!, lesson.access)) return res.status(403).json({ error: { code: "PREMIUM_REQUIRED", message: "This lesson requires Premium" } });
    const exercise = lesson.exercises.find((candidate) => candidate.id === input.exerciseId);
    if (!exercise) return res.status(404).json({ error: { code: "EXERCISE_NOT_FOUND", message: "Exercise not found" } });
    const correct = normalize(input.answer) === normalize(exercise.answer);
    const score = correct ? exercise.points : 0;
    await query("INSERT INTO exercise_attempts (id, user_id, lesson_id, exercise_id, answer, correct, score) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id(), req.userId, lesson.id, exercise.id, input.answer, correct, score]);
    const progress = (await query<{ status: string; best_score: number; completed_at: Date | null }>("INSERT INTO lesson_progress (id, user_id, lesson_id, status, last_block_index, best_score, completed_at, last_activity_at) VALUES ($1,$2,$3,$4,0,$5,$6,now()) ON CONFLICT (user_id, lesson_id) DO UPDATE SET status = CASE WHEN EXCLUDED.status = 'completed' THEN 'completed' ELSE lesson_progress.status END, best_score = GREATEST(lesson_progress.best_score, EXCLUDED.best_score), completed_at = COALESCE(lesson_progress.completed_at, EXCLUDED.completed_at), last_activity_at = now() RETURNING status, best_score, completed_at", [id(), req.userId, lesson.id, correct ? "completed" : "in_progress", score, correct ? new Date() : null])).rows[0]!;
    return res.status(201).json({ result: { correct, score, explanation: exercise.explanation }, progress: { status: progress.status, bestScore: progress.best_score, completedAt: progress.completed_at } });
  } catch (error) { return next(error); }
});

lessonsRouter.patch("/:slug/progress", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try {
    const lesson = await publishedLesson(slugSchema.parse(req.params).slug);
    const input = checkpointSchema.parse(req.body);
    if (!lesson) return res.status(404).json({ error: { code: "LESSON_NOT_FOUND", message: "Lesson not found" } });
    if (!await canAccessContent(req.userId!, lesson.access)) return res.status(403).json({ error: { code: "PREMIUM_REQUIRED", message: "This lesson requires Premium" } });
    if (input.lastBlockIndex >= Math.max(lesson.blocks.length, 1)) return res.status(400).json({ error: { code: "INVALID_CHECKPOINT", message: "Checkpoint is outside this lesson" } });
    const progress = (await query<{ status: string; last_block_index: number; best_score: number }>("INSERT INTO lesson_progress (id, user_id, lesson_id, status, last_block_index, best_score, last_activity_at) VALUES ($1,$2,$3,'in_progress',$4,0,now()) ON CONFLICT (user_id, lesson_id) DO UPDATE SET last_block_index = EXCLUDED.last_block_index, last_activity_at = now() RETURNING status, last_block_index, best_score", [id(), req.userId, lesson.id, input.lastBlockIndex])).rows[0]!;
    return res.json({ progress: { status: progress.status, lastBlockIndex: progress.last_block_index, bestScore: progress.best_score } });
  } catch (error) { return next(error); }
});
