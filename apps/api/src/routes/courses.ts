import { Router } from "express";
import { z } from "zod";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Lesson } from "../models/Lesson.js";
import { requireAuth, requireCsrf, type AuthenticatedRequest } from "../middleware/auth.js";
import { canAccessContent } from "../services/access.js";
import { lessonSummary } from "../services/serializers.js";

const slugSchema = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/).max(100) });
export const coursesRouter = Router();

coursesRouter.get("/", async (_req, res, next) => {
  try {
    const courses = await Course.find({ published: true }).sort({ position: 1 }).lean();
    return res.json({ courses: courses.map((course) => ({ id: course._id.toString(), slug: course.slug, cefrLevel: course.cefrLevel, title: course.title, description: course.description, access: course.access, position: course.position })) });
  } catch (error) { next(error); }
});

coursesRouter.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = slugSchema.parse(req.params);
    const course = await Course.findOne({ slug, published: true });
    if (!course) return res.status(404).json({ error: { code: "COURSE_NOT_FOUND", message: "Course not found" } });
    const lessons = await Lesson.find({ course: course._id, published: true }).sort({ position: 1 });
    return res.json({ course: { id: course.id, slug: course.slug, cefrLevel: course.cefrLevel, title: course.title, description: course.description, access: course.access, position: course.position, lessons: lessons.map(lessonSummary) } });
  } catch (error) { next(error); }
});

coursesRouter.post("/:slug/enrollment", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { slug } = slugSchema.parse(req.params);
    const course = await Course.findOne({ slug, published: true });
    if (!course) return res.status(404).json({ error: { code: "COURSE_NOT_FOUND", message: "Course not found" } });
    if (!await canAccessContent(req.userId!, course.access)) return res.status(403).json({ error: { code: "PREMIUM_REQUIRED", message: "This course requires Premium" } });
    const enrollment = await Enrollment.findOneAndUpdate({ user: req.userId, course: course._id }, { $setOnInsert: { startedAt: new Date() } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return res.status(201).json({ enrollment: { id: enrollment.id, courseId: course.id, startedAt: enrollment.startedAt } });
  } catch (error) { next(error); }
});
