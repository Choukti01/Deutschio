import { Router } from "express";
import { z } from "zod";
import { id, query, type CourseRow, type LessonRow } from "../db.js";
import { requireAuth, requireCsrf, type AuthenticatedRequest } from "../middleware/auth.js";
import { canAccessContent } from "../services/access.js";
import { lessonSummary } from "../services/serializers.js";

const slugSchema = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/).max(100) });
export const coursesRouter = Router();
const coursePublic = (course: CourseRow) => ({ id: course.id, slug: course.slug, cefrLevel: course.cefr_level, title: course.title, description: course.description, access: course.access, position: course.position });

coursesRouter.get("/", async (_req, res, next) => {
  try {
    const courses = await query<CourseRow>("SELECT id, slug, cefr_level, title, description, access, published, position FROM courses WHERE published = true ORDER BY position ASC");
    return res.json({ courses: courses.rows.map(coursePublic) });
  } catch (error) { return next(error); }
});

coursesRouter.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = slugSchema.parse(req.params);
    const course = (await query<CourseRow>("SELECT id, slug, cefr_level, title, description, access, published, position FROM courses WHERE slug = $1 AND published = true", [slug])).rows[0];
    if (!course) return res.status(404).json({ error: { code: "COURSE_NOT_FOUND", message: "Course not found" } });
    const lessons = await query<LessonRow>("SELECT id, course_id, slug, title, summary, position, access, published, duration_minutes, blocks, exercises FROM lessons WHERE course_id = $1 AND published = true ORDER BY position ASC", [course.id]);
    return res.json({ course: { ...coursePublic(course), lessons: lessons.rows.map(lessonSummary) } });
  } catch (error) { return next(error); }
});

coursesRouter.post("/:slug/enrollment", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { slug } = slugSchema.parse(req.params);
    const course = (await query<CourseRow>("SELECT id, slug, cefr_level, title, description, access, published, position FROM courses WHERE slug = $1 AND published = true", [slug])).rows[0];
    if (!course) return res.status(404).json({ error: { code: "COURSE_NOT_FOUND", message: "Course not found" } });
    if (!await canAccessContent(req.userId!, course.access)) return res.status(403).json({ error: { code: "PREMIUM_REQUIRED", message: "This course requires Premium" } });
    const enrollment = (await query<{ id: string; course_id: string; started_at: Date }>("INSERT INTO enrollments (id, user_id, course_id) VALUES ($1, $2, $3) ON CONFLICT (user_id, course_id) DO UPDATE SET course_id = EXCLUDED.course_id RETURNING id, course_id, started_at", [id(), req.userId, course.id])).rows[0]!;
    return res.status(201).json({ enrollment: { id: enrollment.id, courseId: enrollment.course_id, startedAt: enrollment.started_at } });
  } catch (error) { return next(error); }
});
