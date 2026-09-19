type ApiErrorBody = { error?: { code?: string; message?: string }; message?: string };

// Development goes through Vite's same-origin proxy, so secure session cookies
// work without a CORS exception. Production must set VITE_API_URL explicitly.
const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "/api/v1").replace(/\/$/, "");
let csrfToken: string | null = null;

export type Account = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string;
  plan: "free" | "premium";
};

export type RemoteLesson = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  access: "free" | "premium";
  durationMinutes: number;
  blocks: Array<{
    type: "heading" | "paragraph" | "vocabulary";
    title?: string;
    text?: string;
    items?: Array<{ german: string; translation: string }>;
  }>;
  exercises: Array<{
    id: string;
    kind: "multiple_choice";
    prompt: string;
    options: string[];
    explanation: string;
    points: number;
  }>;
};

export type Dashboard = {
  access: { premium: boolean };
  completedLessonSlugs: string[];
  courses: Array<{
    id: string;
    slug: string;
    title: string;
    cefrLevel: string;
    access: "free" | "premium";
    progress: { completed: number; total: number; percent: number };
  }>;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

function mutationMethod(method?: string) {
  return method !== undefined && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

async function request<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (mutationMethod(init.method) && csrfToken) headers.set("X-CSRF-Token", csrfToken);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const data = await response.json().catch(() => ({})) as T & ApiErrorBody;
  if (!response.ok) throw new ApiError(data.error?.message ?? data.message ?? "Something went wrong. Please try again.", response.status, data.error?.code);
  return data as T;
}

export async function signUp(name: string, email: string, password: string) {
  return request<{ message: string; developmentVerificationUrl?: string }>("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) });
}

export async function resendVerification(email: string) {
  return request<{ message: string; developmentVerificationUrl?: string }>("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
}

export async function signIn(email: string, password: string) {
  const result = await request<{ user: Account; csrfToken?: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  csrfToken = result.csrfToken ?? null;
  return result;
}

export async function getCurrentAccount() {
  return request<{ user: Account }>("/me/profile");
}

export async function refreshCsrfToken() {
  const result = await request<{ csrfToken: string }>("/auth/csrf");
  csrfToken = result.csrfToken;
  return result;
}

export async function signOut() {
  if (!csrfToken) await refreshCsrfToken();
  await request<unknown>("/auth/logout", { method: "POST" });
  csrfToken = null;
}

export async function getDashboard() {
  return request<Dashboard>("/me/dashboard");
}

export async function getRemoteLesson(slug: string) {
  return request<{ lesson: RemoteLesson }>(`/lessons/${encodeURIComponent(slug)}`);
}

export async function submitAttempt(slug: string, exerciseId: string, answer: string) {
  return request<{ result: { correct: boolean; score: number; explanation: string }; progress: { status: string; bestScore: number; completedAt?: string } }>(
    `/lessons/${encodeURIComponent(slug)}/attempts`,
    { method: "POST", body: JSON.stringify({ exerciseId, answer }) },
  );
}
