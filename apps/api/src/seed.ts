import "dotenv/config";
import { fileURLToPath } from "node:url";
import { a1Lessons } from "./content/a1.js";
import { a2Lessons } from "./content/a2.js";
import { b1Lessons } from "./content/b1.js";
import { id, migrate, pool, query } from "./db.js";

async function upsertCourse(slug: string, cefrLevel: "A1" | "A2" | "B1", title: string, description: string, access: "free" | "premium", position: number) {
  return (await query<{ id: string }>("INSERT INTO courses (id, slug, cefr_level, title, description, access, published, position) VALUES ($1,$2,$3,$4,$5,$6,true,$7) ON CONFLICT (slug) DO UPDATE SET cefr_level=EXCLUDED.cefr_level,title=EXCLUDED.title,description=EXCLUDED.description,access=EXCLUDED.access,published=true,position=EXCLUDED.position,updated_at=now() RETURNING id", [id(), slug, cefrLevel, title, description, access, position])).rows[0]!.id;
}

// Updates editorial content by slug without touching learner progress, attempts,
// points, accounts, or entitlements.
export async function syncCatalog() {
  const a1 = await upsertCourse("a1-foundations", "A1", "A1 · Foundations", "Build practical confidence with greetings, daily life, food and travel.", "free", 1);
  const a2 = await upsertCourse("a2-everyday-independence", "A2", "A2 · Everyday independence", "Travel, work, make plans and handle everyday German situations independently.", "free", 2);
  const b1 = await upsertCourse("b1-confident-conversation", "B1", "B1 · Confident conversation", "Express opinions and navigate richer conversations about the topics that matter to you.", "premium", 3);

  for (const lesson of a1Lessons) {
    await query("INSERT INTO lessons (id, course_id, slug, title, summary, position, access, published, duration_minutes, blocks, exercises) VALUES ($1,$2,$3,$4,$5,$6,'free',true,$7,$8::jsonb,$9::jsonb) ON CONFLICT (slug) DO UPDATE SET course_id=EXCLUDED.course_id,title=EXCLUDED.title,summary=EXCLUDED.summary,position=EXCLUDED.position,duration_minutes=EXCLUDED.duration_minutes,blocks=EXCLUDED.blocks,exercises=EXCLUDED.exercises,published=true,updated_at=now()", [id(), a1, lesson.slug, lesson.title, lesson.summary, lesson.position, lesson.durationMinutes, JSON.stringify(lesson.blocks), JSON.stringify(lesson.exercises)]);
  }

  for (const lesson of a2Lessons) {
    await query("INSERT INTO lessons (id, course_id, slug, title, summary, position, access, published, duration_minutes, blocks, exercises) VALUES ($1,$2,$3,$4,$5,$6,'free',true,$7,$8::jsonb,$9::jsonb) ON CONFLICT (slug) DO UPDATE SET course_id=EXCLUDED.course_id,title=EXCLUDED.title,summary=EXCLUDED.summary,position=EXCLUDED.position,duration_minutes=EXCLUDED.duration_minutes,blocks=EXCLUDED.blocks,exercises=EXCLUDED.exercises,published=true,updated_at=now()", [id(), a2, lesson.slug, lesson.title, lesson.summary, lesson.position, lesson.durationMinutes, JSON.stringify(lesson.blocks), JSON.stringify(lesson.exercises)]);
  }

  for (const lesson of b1Lessons) {
    await query("INSERT INTO lessons (id, course_id, slug, title, summary, position, access, published, duration_minutes, blocks, exercises) VALUES ($1,$2,$3,$4,$5,$6,'premium',true,$7,$8::jsonb,$9::jsonb) ON CONFLICT (slug) DO UPDATE SET course_id=EXCLUDED.course_id,title=EXCLUDED.title,summary=EXCLUDED.summary,position=EXCLUDED.position,duration_minutes=EXCLUDED.duration_minutes,blocks=EXCLUDED.blocks,exercises=EXCLUDED.exercises,published=true,updated_at=now()", [id(), b1, lesson.slug, lesson.title, lesson.summary, lesson.position, lesson.durationMinutes, JSON.stringify(lesson.blocks), JSON.stringify(lesson.exercises)]);
  }
}

async function run() {
  await migrate();
  await syncCatalog();
  console.log("Synced Deutschio PostgreSQL learning catalog");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await pool.end(); });
}
