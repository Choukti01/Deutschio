import { Router } from "express";
import { z } from "zod";
import { publicUser, query, type UserRow } from "../db.js";
import { requireAuth, requireCsrf, type AuthenticatedRequest } from "../middleware/auth.js";
import { hasActiveEntitlement } from "../services/access.js";

export const meRouter = Router();
const profileSchema = z.object({ name: z.string().trim().min(1).max(80).optional(), avatarUrl: z.string().url().max(2_000).or(z.literal("")).optional(), notes: z.array(z.object({ text: z.string().trim().min(1).max(2_000), createdAt: z.coerce.date().optional() })).max(100).optional() }).strict().refine((value) => Object.keys(value).length > 0, { message: "Provide at least one profile field" });
const userColumns = "id, email, password_hash, email_verified, verification_token_hash, verification_token_expires_at, name, avatar_url, notes, plan, created_at";

meRouter.get("/profile", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = (await query<UserRow>(`SELECT ${userColumns} FROM users WHERE id = $1`, [req.userId])).rows[0];
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "Account not found" } });
    res.set("Cache-Control", "no-store");
    return res.json({ user: publicUser(user) });
  } catch (error) { return next(error); }
});

meRouter.patch("/profile", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = profileSchema.parse(req.body);
    const user = (await query<UserRow>(`UPDATE users SET name = COALESCE($2, name), avatar_url = COALESCE($3, avatar_url), notes = COALESCE($4::jsonb, notes), updated_at = now() WHERE id = $1 RETURNING ${userColumns}`, [req.userId, input.name ?? null, input.avatarUrl ?? null, input.notes === undefined ? null : JSON.stringify(input.notes)])).rows[0];
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "Account not found" } });
    res.set("Cache-Control", "no-store");
    return res.json({ user: publicUser(user) });
  } catch (error) { return next(error); }
});

meRouter.get("/dashboard", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const [courses, enrollments, completed, premium] = await Promise.all([
      query<{ id: string; slug: string; title: string; cefr_level: string; access: string; total: string; completed: string }>("SELECT c.id, c.slug, c.title, c.cefr_level, c.access, COUNT(l.id)::text AS total, COUNT(lp.id) FILTER (WHERE lp.status = 'completed')::text AS completed FROM courses c LEFT JOIN lessons l ON l.course_id = c.id AND l.published = true LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1 WHERE c.published = true GROUP BY c.id ORDER BY c.position", [req.userId]),
      query<{ course_id: string; started_at: Date; completed_at: Date | null }>("SELECT course_id, started_at, completed_at FROM enrollments WHERE user_id = $1", [req.userId]),
      query<{ slug: string }>("SELECT l.slug FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id WHERE lp.user_id = $1 AND lp.status = 'completed'", [req.userId]),
      hasActiveEntitlement(req.userId!, "premium"),
    ]);
    return res.json({
      access: { premium }, completedLessonSlugs: completed.rows.map((row) => row.slug),
      enrollments: enrollments.rows.map((row) => ({ courseId: row.course_id, startedAt: row.started_at, completedAt: row.completed_at })),
      courses: courses.rows.map((row) => { const total = Number(row.total); const completedCount = Number(row.completed); return { id: row.id, slug: row.slug, title: row.title, cefrLevel: row.cefr_level, access: row.access, progress: { completed: completedCount, total, percent: total ? Math.round((completedCount / total) * 100) : 0 } }; }),
    });
  } catch (error) { return next(error); }
});
