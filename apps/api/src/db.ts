import { randomUUID } from "node:crypto";
import { Pool, type QueryResultRow } from "pg";
import { env } from "./config.js";

export type Access = "free" | "premium";
export type LearningLanguage = "en" | "ar";
export type Translation = Record<LearningLanguage, string>;
export type LessonBlock = { type: "heading" | "paragraph" | "vocabulary"; title?: string; text?: string; items?: Array<{ german: string; translations: Translation }> };
export type Exercise = { id: string; kind: "multiple_choice"; prompt: string; options: Array<{ id: string; translations: Translation }>; answer: string; explanation: Translation; points: number };
export type UserRow = { id: string; email: string; password_hash: string; email_verified: boolean; verification_token_hash: string | null; verification_token_expires_at: Date | null; name: string; avatar_url: string; notes: unknown; learning_language: LearningLanguage; plan: Access; created_at: Date };
export type CourseRow = { id: string; slug: string; cefr_level: "A1" | "A2" | "B1" | "B2"; title: string; description: string; access: Access; published: boolean; position: number };
export type LessonRow = { id: string; course_id: string; slug: string; title: string; summary: string; position: number; access: Access; published: boolean; duration_minutes: number; blocks: LessonBlock[]; exercises: Exercise[] };

const url = new URL(env.DATABASE_URL);
const usesLocalPostgres = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
// Supabase's Session Pooler uses a managed certificate chain that Node's
// serverless trust store cannot currently verify. Keep TLS encryption on and
// limit this compatibility exception to the official pooler hostname.
const usesSupabasePooler = /(?:^|\.)pooler\.supabase\.com$/i.test(url.hostname);

// `pg` lets `sslmode` embedded in a connection URI override the `ssl` option
// below. Supabase's pooler URI contains `sslmode=require`, so remove that URI
// directive and make this module the single source of truth for TLS behaviour.
url.searchParams.delete("sslmode");
const isServerless =
  process.env.DEUTSCHIO_SERVERLESS === "true" ||
  process.env.NETLIFY === "true" ||
  process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
export const pool = new Pool({
  connectionString: url.toString(),
  ssl: usesLocalPostgres ? false : { rejectUnauthorized: !usesSupabasePooler },
  // Serverless runtimes can create multiple warm instances. A small pool per
  // instance keeps the shared Supabase connection limit healthy as traffic
  // grows, while local development still has a comfortable pool size.
  max: isServerless ? 2 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export function assertDatabaseRuntimeConfiguration() {
  // A loopback address is valid for local development, but in a deployed
  // serverless function it refers to the function container itself. Failing
  // early gives deploy logs an actionable cause instead of a connection timeout.
  if (env.NODE_ENV === "production" && usesLocalPostgres) {
    throw new Error("DATABASE_URL must point to a hosted PostgreSQL service in production, not localhost or 127.0.0.1.");
  }
}

export function id() { return randomUUID(); }

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return pool.query<T>(text, values);
}

async function upgradeLegacyUsersTable() {
  const currentId = await query<{ data_type: string }>(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'
  `);
  const idType = currentId.rows[0]?.data_type;
  if (!idType) return;

  // The original Deutschio prototype stored numeric user ids plus a PIN. Keep
  // those rows and their original ids, but give every existing learner the UUID
  // identity required by the modern authentication and progress tables.
  const isLegacy = idType !== "uuid";
  if (isLegacy) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("ALTER TABLE users RENAME COLUMN id TO legacy_id");
      await client.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey");
      await client.query("ALTER TABLE users ADD COLUMN id uuid");
      // Supabase Realtime may publish this legacy table. While its new UUID
      // primary key is being populated, a temporary replica identity lets the
      // one-time update remain valid for that publication.
      await client.query("ALTER TABLE users REPLICA IDENTITY FULL");
      await client.query("UPDATE users SET id = md5(legacy_id::text || clock_timestamp()::text || random()::text)::uuid WHERE id IS NULL");
      await client.query("ALTER TABLE users ALTER COLUMN id SET NOT NULL");
      await client.query("ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id)");
      await client.query("ALTER TABLE users REPLICA IDENTITY DEFAULT");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Add the modern account fields without removing legacy columns (such as
  // `pin`). Existing prototype accounts remain preserved but cannot be used to
  // bypass the new password-and-email-verification flow.
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_hash text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at timestamptz;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notes jsonb NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_language text NOT NULL DEFAULT 'en';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
  `);

  if (isLegacy) {
    await query(`
      UPDATE users
      SET email = COALESCE(email, 'legacy-' || legacy_id::text || '@invalid.deutschio.local'),
          name = COALESCE(name, ''),
          avatar_url = COALESCE(avatar_url, ''),
          notes = COALESCE(notes, '[]'::jsonb),
          learning_language = COALESCE(learning_language, 'en'),
          plan = COALESCE(plan, 'free'),
          updated_at = COALESCE(updated_at, created_at, now());
    `);
  }
  await query("CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email) WHERE email IS NOT NULL");
}

export async function migrate() {
  await upgradeLegacyUsersTable();
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL,
      email_verified boolean NOT NULL DEFAULT false, verification_token_hash text,
      verification_token_expires_at timestamptz, name text NOT NULL DEFAULT '',
      avatar_url text NOT NULL DEFAULT '', notes jsonb NOT NULL DEFAULT '[]'::jsonb,
      learning_language text NOT NULL DEFAULT 'en' CHECK (learning_language IN ('en', 'ar')),
      plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE, csrf_token_hash text NOT NULL,
      expires_at timestamptz NOT NULL, last_seen_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS courses (
      id uuid PRIMARY KEY, slug text NOT NULL UNIQUE, cefr_level text NOT NULL CHECK (cefr_level IN ('A1','A2','B1','B2')),
      title text NOT NULL, description text NOT NULL, access text NOT NULL DEFAULT 'free' CHECK (access IN ('free','premium')),
      published boolean NOT NULL DEFAULT false, position integer NOT NULL CHECK (position >= 0),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS lessons (
      id uuid PRIMARY KEY, course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      slug text NOT NULL UNIQUE, title text NOT NULL, summary text NOT NULL,
      position integer NOT NULL CHECK (position >= 0), access text NOT NULL CHECK (access IN ('free','premium')),
      published boolean NOT NULL DEFAULT false, duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 1 AND 180),
      blocks jsonb NOT NULL DEFAULT '[]'::jsonb, exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(course_id, position)
    );
    CREATE TABLE IF NOT EXISTS enrollments (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE, started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, course_id)
    );
    CREATE TABLE IF NOT EXISTS entitlements (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key text NOT NULL CHECK (key IN ('premium')), source text NOT NULL CHECK (source IN ('manual','trial','subscription')),
      starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz, revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
      last_block_index integer NOT NULL DEFAULT 0 CHECK (last_block_index >= 0), best_score integer NOT NULL DEFAULT 0 CHECK (best_score >= 0),
      completed_at timestamptz, last_activity_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS exercise_attempts (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE, exercise_id text NOT NULL,
      answer text NOT NULL, correct boolean NOT NULL, score integer NOT NULL CHECK (score >= 0), created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS sessions_active_idx ON sessions(token_hash) WHERE revoked_at IS NULL;
    CREATE INDEX IF NOT EXISTS lessons_published_idx ON lessons(course_id, position) WHERE published;
    CREATE INDEX IF NOT EXISTS entitlements_active_idx ON entitlements(user_id, key, starts_at DESC) WHERE revoked_at IS NULL;
    CREATE INDEX IF NOT EXISTS lesson_progress_user_idx ON lesson_progress(user_id, lesson_id);
  `);
  // Existing databases predate the learning-language preference column.
  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_language text NOT NULL DEFAULT 'en' CHECK (learning_language IN ('en', 'ar'))");
}

export function publicUser(user: UserRow) {
  return { id: user.id, email: user.email, emailVerified: user.email_verified, name: user.name, avatarUrl: user.avatar_url, notes: user.notes, learningLanguage: user.learning_language, plan: user.plan, createdAt: user.created_at };
}

export function lessonSummary(lesson: LessonRow) {
  return { id: lesson.id, slug: lesson.slug, title: lesson.title, summary: lesson.summary, position: lesson.position, access: lesson.access, durationMinutes: lesson.duration_minutes };
}

export function learnerLesson(lesson: LessonRow) {
  return { ...lessonSummary(lesson), blocks: lesson.blocks, exercises: lesson.exercises.map(({ answer: _answer, ...exercise }) => exercise) };
}
