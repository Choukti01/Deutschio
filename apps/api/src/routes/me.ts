import { Router } from "express";
import { z } from "zod";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Lesson } from "../models/Lesson.js";
import { LessonProgress } from "../models/LessonProgress.js";
import { User } from "../models/User.js";
import { requireAuth, requireCsrf, type AuthenticatedRequest } from "../middleware/auth.js";
import { hasActiveEntitlement } from "../services/access.js";

export const meRouter = Router();

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  avatarUrl: z.string().url().max(2_000).or(z.literal("")).optional(),
  notes: z.array(z.object({
    text: z.string().trim().min(1).max(2_000),
    createdAt: z.coerce.date().optional(),
  })).max(100).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: "Provide at least one profile field" });

type PublicUserSource = {
  _id: { toString(): string };
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string;
  notes: unknown;
  plan: string;
  createdAt: Date;
};

function publicUser(user: PublicUserSource) {
  return {
    id: user._id.toString(),
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    avatarUrl: user.avatarUrl,
    notes: user.notes,
    plan: user.plan,
    createdAt: user.createdAt,
  };
}

meRouter.get("/profile", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "Account not found" } });
    res.set("Cache-Control", "no-store");
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

meRouter.patch("/profile", requireAuth, requireCsrf, async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = profileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.userId, { $set: input }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "Account not found" } });
    res.set("Cache-Control", "no-store");
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

meRouter.get("/dashboard", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const [courses, enrollments, progress, premium] = await Promise.all([
      Course.find({ published: true }).sort({ position: 1 }).lean(),
      Enrollment.find({ user: req.userId }).lean(),
      LessonProgress.find({ user: req.userId }).lean(),
      hasActiveEntitlement(req.userId!, "premium"),
    ]);
    const lessons = await Lesson.find({ course: { $in: courses.map((course) => course._id) }, published: true }).lean();
    const completedByLesson = new Map(progress.filter((item) => item.status === "completed").map((item) => [item.lesson.toString(), item]));
    const lessonsByCourse = new Map<string, typeof lessons>();
    for (const lesson of lessons) {
      const key = lesson.course.toString();
      lessonsByCourse.set(key, [...(lessonsByCourse.get(key) ?? []), lesson]);
    }
    return res.json({
      access: { premium },
      completedLessonSlugs: lessons
        .filter((lesson) => completedByLesson.has(lesson._id.toString()))
        .map((lesson) => lesson.slug),
      enrollments: enrollments.map((enrollment) => ({ courseId: enrollment.course.toString(), startedAt: enrollment.startedAt, completedAt: enrollment.completedAt })),
      courses: courses.map((course) => {
        const courseLessons = lessonsByCourse.get(course._id.toString()) ?? [];
        const completed = courseLessons.filter((lesson) => completedByLesson.has(lesson._id.toString())).length;
        return { id: course._id.toString(), slug: course.slug, title: course.title, cefrLevel: course.cefrLevel, access: course.access, progress: { completed, total: courseLessons.length, percent: courseLessons.length ? Math.round((completed / courseLessons.length) * 100) : 0 } };
      }),
    });
  } catch (error) { next(error); }
});
