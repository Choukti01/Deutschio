import type { LessonDocument } from "../models/Lesson.js";

export function lessonSummary(lesson: LessonDocument) {
  return {
    id: lesson._id?.toString(),
    slug: lesson.slug,
    title: lesson.title,
    summary: lesson.summary,
    position: lesson.position,
    access: lesson.access,
    durationMinutes: lesson.durationMinutes,
  };
}

export function learnerLesson(lesson: LessonDocument) {
  return {
    ...lessonSummary(lesson),
    blocks: lesson.blocks,
    exercises: lesson.exercises.map(({ answer: _answer, ...exercise }) => exercise),
  };
}
