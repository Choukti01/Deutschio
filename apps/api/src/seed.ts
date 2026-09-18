import "dotenv/config";
import { id, migrate, pool, query } from "./db.js";

if (process.env.NODE_ENV === "production") throw new Error("The demo seed is intentionally disabled in production");

type Lesson = { slug: string; title: string; summary: string; position: number; durationMinutes: number; blocks: unknown[]; exercises: unknown[] };
const a1Lessons: Lesson[] = [
  { slug: "a1-greetings", title: "Hello and goodbye", summary: "Meet the German greetings you will use from your very first conversation.", position: 1, durationMinutes: 8, blocks: [{ type: "heading", title: "Start with a friendly hello" }, { type: "paragraph", text: "German greetings change naturally across the day. Learn the phrase, listen to its rhythm, then use it in a small real-life exchange." }, { type: "vocabulary", items: [{ german: "Hallo", translation: "Hello" }, { german: "Guten Morgen", translation: "Good morning" }, { german: "Tschüss", translation: "Bye" }] }], exercises: [{ id: "greeting-meaning", kind: "multiple_choice", prompt: "What does ‘Guten Morgen’ mean?", options: ["Good morning", "Good evening", "Goodbye", "Thank you"], answer: "Good morning", explanation: "Guten Morgen is the standard greeting before midday.", points: 10 }] },
  { slug: "a1-family", title: "Family", summary: "Talk about family members with useful everyday nouns and articles.", position: 2, durationMinutes: 10, blocks: [{ type: "heading", title: "People around you" }, { type: "vocabulary", items: [{ german: "die Mutter", translation: "mother" }, { german: "der Vater", translation: "father" }, { german: "die Familie", translation: "family" }] }], exercises: [{ id: "family-meaning", kind: "multiple_choice", prompt: "What does ‘die Mutter’ mean?", options: ["Sister", "Mother", "Daughter", "Grandmother"], answer: "Mother", explanation: "Mutter means mother. Learn the article die with the word.", points: 10 }] },
];

async function upsertCourse(slug: string, cefrLevel: "A1" | "B1", title: string, description: string, access: "free" | "premium", position: number) {
  return (await query<{ id: string }>("INSERT INTO courses (id, slug, cefr_level, title, description, access, published, position) VALUES ($1,$2,$3,$4,$5,$6,true,$7) ON CONFLICT (slug) DO UPDATE SET cefr_level=EXCLUDED.cefr_level,title=EXCLUDED.title,description=EXCLUDED.description,access=EXCLUDED.access,published=true,position=EXCLUDED.position,updated_at=now() RETURNING id", [id(), slug, cefrLevel, title, description, access, position])).rows[0]!.id;
}

async function seed() {
  await migrate();
  const a1 = await upsertCourse("a1-foundations", "A1", "A1 · Foundations", "Build practical confidence with greetings, introductions and the language of daily life.", "free", 1);
  const b1 = await upsertCourse("b1-confident-conversation", "B1", "B1 · Confident conversation", "Express opinions and navigate richer conversations about the topics that matter to you.", "premium", 3);
  for (const lesson of a1Lessons) await query("INSERT INTO lessons (id, course_id, slug, title, summary, position, access, published, duration_minutes, blocks, exercises) VALUES ($1,$2,$3,$4,$5,$6,'free',true,$7,$8::jsonb,$9::jsonb) ON CONFLICT (slug) DO UPDATE SET course_id=EXCLUDED.course_id,title=EXCLUDED.title,summary=EXCLUDED.summary,position=EXCLUDED.position,duration_minutes=EXCLUDED.duration_minutes,blocks=EXCLUDED.blocks,exercises=EXCLUDED.exercises,published=true,updated_at=now()", [id(), a1, lesson.slug, lesson.title, lesson.summary, lesson.position, lesson.durationMinutes, JSON.stringify(lesson.blocks), JSON.stringify(lesson.exercises)]);
  await query("INSERT INTO lessons (id, course_id, slug, title, summary, position, access, published, duration_minutes, blocks, exercises) VALUES ($1,$2,'b1-health','Health and wellbeing','Build the vocabulary you need to describe how you feel and get help when you need it.',1,'premium',true,14,$3::jsonb,$4::jsonb) ON CONFLICT (slug) DO UPDATE SET course_id=EXCLUDED.course_id,published=true,updated_at=now()", [id(), b1, JSON.stringify([{ type: "heading", title: "Talking about how you feel" }]), JSON.stringify([{ id: "health-meaning", kind: "multiple_choice", prompt: "What does ‘die Apotheke’ mean?", options: ["Hospital", "Pharmacy", "Doctor", "Insurance"], answer: "Pharmacy", explanation: "Die Apotheke is where you collect medication.", points: 10 }])]);
  console.log("Seeded Deutschio PostgreSQL demo content");
}
seed().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await pool.end(); });
