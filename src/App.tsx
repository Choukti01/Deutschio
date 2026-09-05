import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Crown,
  Headphones,
  LockKeyhole,
  Menu,
  Play,
  Sparkles,
  Target,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import {
  ApiError,
  getCurrentAccount,
  getDashboard,
  getRemoteLesson,
  refreshCsrfToken,
  resendVerification,
  signIn,
  signOut,
  signUp,
  submitAttempt,
  type Account,
  type RemoteLesson,
} from "./api";
import brandLogo from "./assets/deutschio-logo.png";
import { courses, getCourse, getLesson, type Course, type Lesson, type LessonStatus } from "./content";

type View = "home" | "dashboard" | "course" | "lesson" | "pricing" | "login" | "signup";
type PracticePrompt = { german: string; translation: string; options: string[]; tip: string };
type RouteState = { view: View; courseCode: string; lessonId: string | null };

const prompts: Record<string, PracticePrompt> = {
  "a1-greetings": { german: "Guten Morgen", translation: "Good morning", options: ["Good morning", "Good evening", "Goodbye", "Thank you"], tip: "Use Guten Morgen before midday. It is polite but completely normal in daily conversation." },
  "a1-introductions": { german: "Wie heißt du?", translation: "What is your name?", options: ["Where are you from?", "What is your name?", "How are you?", "Nice to meet you"], tip: "Use du with people you know, friends and most peers. Formal German uses Sie." },
  "a1-simple-questions": { german: "Wie geht's dir?", translation: "How are you?", options: ["Where do you live?", "How are you?", "What time is it?", "What is that?"], tip: "The shortened form geht's is natural in spoken German." },
  "a1-family": { german: "die Mutter", translation: "mother", options: ["sister", "mother", "daughter", "grandmother"], tip: "Nouns are written with a capital letter in German. Learn their article with every new word." },
  "a1-numbers": { german: "zehn", translation: "ten", options: ["seven", "ten", "twelve", "twenty"], tip: "German number words are one word; get comfortable hearing their rhythm early." },
  "a1-days": { german: "morgen", translation: "tomorrow", options: ["morning", "yesterday", "tomorrow", "Monday"], tip: "Morgen can mean tomorrow. Der Morgen means the morning." },
};

const fallbackPrompt: PracticePrompt = {
  german: "Ich lerne Deutsch.",
  translation: "I am learning German.",
  options: ["I speak German.", "I am learning German.", "I live in Germany.", "I like German."],
  tip: "Short, useful sentences are the fastest route from vocabulary to confident conversation.",
};

function speakGerman(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.84;
  window.speechSynthesis.speak(utterance);
}

function readCompletedLessons() {
  try {
    const saved = window.localStorage.getItem("deutschio.completedLessons");
    const completed = saved ? JSON.parse(saved) : [];
    return Array.isArray(completed) && completed.every((lessonId) => typeof lessonId === "string") ? completed : [];
  } catch {
    return [];
  }
}

function routeFromLocation(): RouteState {
  const url = new URL(window.location.href);
  const parts = url.pathname.split("/").filter(Boolean);
  const courseCode = parts[1]?.toUpperCase();
  const knownCourse = courses.find((course) => course.code === courseCode);

  if (url.searchParams.get("verified") === "true") return { view: "login", courseCode: "A1", lessonId: null };
  if (parts[0] === "learn") return { view: "dashboard", courseCode: "A1", lessonId: null };
  if (parts[0] === "pricing") return { view: "pricing", courseCode: "A1", lessonId: null };
  if (parts[0] === "login") return { view: "login", courseCode: "A1", lessonId: null };
  if (parts[0] === "signup") return { view: "signup", courseCode: "A1", lessonId: null };
  if (parts[0] === "courses" && knownCourse) return { view: "course", courseCode: knownCourse.code, lessonId: null };
  if (parts[0] === "lessons" && parts[1]) {
    const course = courses.find((candidate) => courseLessons(candidate).some((lesson) => lesson.id === parts[1]));
    if (course) return { view: "lesson", courseCode: course.code, lessonId: parts[1] };
  }
  return { view: "home", courseCode: "A1", lessonId: null };
}

function pathForRoute(route: RouteState) {
  if (route.view === "dashboard") return "/learn";
  if (route.view === "pricing") return "/pricing";
  if (route.view === "login") return "/login";
  if (route.view === "signup") return "/signup";
  if (route.view === "course") return `/courses/${route.courseCode.toLowerCase()}`;
  if (route.view === "lesson" && route.lessonId) return `/lessons/${route.lessonId}`;
  return "/";
}

function courseLessons(course: Course) {
  return course.units.flatMap((unit) => unit.lessons);
}

function progressForCourse(course: Course, completed: string[]) {
  const lessons = courseLessons(course);
  const done = lessons.filter((lesson) => completed.includes(lesson.id)).length;
  return { done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
}

function lessonStatus(course: Course, lesson: Lesson, completed: string[], premium: boolean): LessonStatus {
  if (completed.includes(lesson.id)) return "completed";
  if (lesson.access === "premium" && !premium) return "locked";
  const lessons = courseLessons(course);
  const index = lessons.findIndex((candidate) => candidate.id === lesson.id);
  const previous = lessons[index - 1];
  if (index === 0 || previous?.access === "premium" || completed.includes(previous?.id ?? "")) return "current";
  return "available";
}

function StatusIcon({ status }: { status: LessonStatus }) {
  if (status === "completed") return <CheckCircle2 aria-label="Completed" />;
  if (status === "locked") return <LockKeyhole aria-label="Premium lesson" />;
  if (status === "current") return <Play aria-label="Continue lesson" />;
  return <Circle aria-label="Available lesson" />;
}

export function App() {
  const initialRoute = routeFromLocation();
  const [view, setView] = useState<View>(initialRoute.view);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCourseCode, setSelectedCourseCode] = useState(initialRoute.courseCode);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(initialRoute.lessonId);
  const [completed, setCompleted] = useState<string[]>(readCompletedLessons);
  const [account, setAccount] = useState<Account | null>(null);
  const [premium, setPremium] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const selectedCourse = getCourse(selectedCourseCode);
  const selectedLesson = getLesson(selectedCourse, selectedLessonId);
  const signedIn = Boolean(account);

  const refreshAccountData = async () => {
    const dashboard = await getDashboard();
    setPremium(dashboard.access.premium);
    setCompleted(dashboard.completedLessonSlugs);
    return dashboard;
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await getCurrentAccount();
        if (!active) return;
        setAccount(result.user);
        setPremium(result.user.plan === "premium");
        await refreshCsrfToken();
        if (active) await refreshAccountData();
      } catch (error) {
        // Anonymous visitors are expected to receive 401 here. The landing page
        // remains fully usable as a product preview without a session.
        if (!(error instanceof ApiError && error.status === 401)) console.info("Deutschio session is not available yet");
      } finally {
        if (active) setSessionReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("deutschio.completedLessons", JSON.stringify(completed));
  }, [completed]);

  useEffect(() => {
    const restoreRoute = () => {
      const route = routeFromLocation();
      setView(route.view);
      setSelectedCourseCode(route.courseCode);
      setSelectedLessonId(route.lessonId);
      setMenuOpen(false);
    };
    window.addEventListener("popstate", restoreRoute);
    return () => window.removeEventListener("popstate", restoreRoute);
  }, []);

  const show = (next: View, options: Partial<Omit<RouteState, "view">> = {}) => {
    const route: RouteState = {
      view: next,
      courseCode: options.courseCode ?? selectedCourseCode,
      lessonId: options.lessonId ?? selectedLessonId,
    };
    setView(next);
    setSelectedCourseCode(route.courseCode);
    setSelectedLessonId(route.lessonId);
    setMenuOpen(false);
    const destination = pathForRoute(route);
    if (`${window.location.pathname}${window.location.search}` !== destination) window.history.pushState({}, "", destination);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCourse = (code: string) => {
    const course = getCourse(code);
    const nextLesson = courseLessons(course).find((lesson) => !completed.includes(lesson.id)) ?? courseLessons(course)[0];
    show("course", { courseCode: course.code, lessonId: nextLesson?.id ?? null });
  };

  const openLesson = (lesson: Lesson) => {
    if (lesson.access === "premium" && !premium) {
      show("pricing");
      return;
    }
    const lessonCourse = courses.find((course) => courseLessons(course).some((candidate) => candidate.id === lesson.id)) ?? selectedCourse;
    show("lesson", { courseCode: lessonCourse.code, lessonId: lesson.id });
  };

  const completeLesson = (lessonId: string) => {
    setCompleted((current) => current.includes(lessonId) ? current : [...current, lessonId]);
  };

  const handleSignedIn = (nextAccount: Account) => {
    setAccount(nextAccount);
    setPremium(nextAccount.plan === "premium");
    void refreshAccountData().catch(() => undefined);
    show("dashboard");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Clearing the app state still protects the local interface if a stale
      // session has already expired on the API.
    } finally {
      setAccount(null);
      setPremium(false);
      show("home");
    }
  };

  return <main>
    <Header view={view} menuOpen={menuOpen} signedIn={signedIn} account={account} onMenu={() => setMenuOpen((open) => !open)} onNavigate={show} onSignOut={() => void handleSignOut()} />
    {view === "home" && <Home onNavigate={show} onOpenCourse={openCourse} />}
    {view === "dashboard" && <Dashboard completed={completed} account={account} sessionReady={sessionReady} onOpenCourse={openCourse} onOpenLesson={openLesson} onNavigate={show} />}
    {view === "course" && <CourseMap course={selectedCourse} completed={completed} premium={premium} onBack={() => show("dashboard")} onOpenLesson={openLesson} onNavigate={show} />}
    {view === "lesson" && selectedLesson && <LessonPlayer course={selectedCourse} lesson={selectedLesson} signedIn={signedIn} onBack={() => show("course")} onComplete={() => { completeLesson(selectedLesson.id); show("course"); }} />}
    {view === "pricing" && <Pricing onNavigate={show} />}
    {(view === "login" || view === "signup") && <AuthScreen mode={view} onNavigate={show} onSignedIn={handleSignedIn} />}
    <Footer onNavigate={show} />
  </main>;
}

function BrandLogo() {
  return <img className="brand-logo" src={brandLogo} alt="Deutschio" />;
}

function Header({ view, menuOpen, signedIn, account, onMenu, onNavigate, onSignOut }: { view: View; menuOpen: boolean; signedIn: boolean; account: Account | null; onMenu: () => void; onNavigate: (view: View) => void; onSignOut: () => void }) {
  return <header className="nav shell">
    <button className="brand brand-button" onClick={() => onNavigate("home")} aria-label="Deutschio home"><BrandLogo /></button>
    <button className="menu-button" onClick={onMenu} aria-label="Toggle navigation" aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
    <nav className={menuOpen ? "nav-links open" : "nav-links"} aria-label="Main navigation">
      <button className={view === "dashboard" ? "nav-active" : ""} onClick={() => onNavigate("dashboard")}>My learning</button>
      <button onClick={() => onNavigate("home")}>Courses</button>
      <button className={view === "pricing" ? "nav-active" : ""} onClick={() => onNavigate("pricing")}>Pricing</button>
      {signedIn ? <button className="text-button" onClick={() => onNavigate("dashboard")}>{account?.name || "My account"}</button> : <button className="text-button" onClick={() => onNavigate("login")}>Sign in</button>}
      {signedIn ? <button className="primary-button compact" onClick={() => onNavigate("dashboard")}>Continue</button> : <button className="primary-button compact" onClick={() => onNavigate("signup")}>Start free</button>}
      {signedIn && <button className="text-button" onClick={onSignOut}>Sign out</button>}
    </nav>
  </header>;
}

function Home({ onNavigate, onOpenCourse }: { onNavigate: (view: View) => void; onOpenCourse: (code: string) => void }) {
  return <>
    <section className="hero shell" id="top">
      <div className="hero-copy"><p className="eyebrow"><Sparkles size={16} /> A smarter path to German</p><h1>German that stays <em>with you.</em></h1><p className="lede">Short, focused lessons. Real-world vocabulary. A learning path that helps every first <i>Hallo</i> become confident conversation.</p><div className="hero-actions"><button className="primary-button" onClick={() => onNavigate("signup")}>Start learning free <ArrowRight size={18} /></button><button className="secondary-button" onClick={() => onOpenCourse("A1")}>Explore A1</button></div><div className="trust-row"><span><Check /> No credit card</span><span><Check /> 10-minute lessons</span></div></div>
      <div className="lesson-preview" aria-label="Sample German lesson"><div className="preview-top"><span>Daily practice</span><strong>7 day streak</strong></div><div className="progress-track"><span /></div><div className="word-card"><p>Today&apos;s phrase</p><button type="button" onClick={() => speakGerman("Wie geht's dir?")} aria-label="Listen to pronunciation"><Headphones /></button><h2>Wie geht&apos;s dir?</h2><span>How are you?</span></div><div className="answer-card"><Headphones /><span>Practice pronunciation</span><ArrowRight /></div></div>
    </section>
    <section className="course-section shell"><div className="section-heading"><div><p className="eyebrow">Your learning path</p><h2>Grow one level at a time</h2></div><p>Structured around the CEFR framework, with useful language from day one.</p></div><div className="course-grid">{courses.map((course) => <article className="course-card" key={course.code} style={{ "--accent": course.accent } as CSSProperties}><div className="course-meta"><span>{course.code}</span><small>{course.access}</small></div><h3>{course.title}</h3><p>{course.description}</p><footer><span><BookOpen size={17} /> {courseLessons(course).length} lessons</span><button onClick={() => onOpenCourse(course.code)} aria-label={`Open ${course.code}`}><ArrowRight /></button></footer></article>)}</div></section>
    <section className="method"><div className="shell method-inner"><div><p className="eyebrow">Designed for consistency</p><h2>A little German.<br />Every single day.</h2></div><div className="method-points"><article><b>01</b><div><h3>Learn in context</h3><p>Remember words through useful phrases and situations, not isolated lists.</p></div></article><article><b>02</b><div><h3>Practice actively</h3><p>Recall, listen and speak so every session builds usable German.</p></div></article><article><b>03</b><div><h3>Review at the right time</h3><p>Smart repetition brings difficult words back before you forget them.</p></div></article></div></div></section>
    <section className="cta shell"><p>Ready when you are.</p><h2>Make German part of your day.</h2><button className="primary-button" onClick={() => onNavigate("signup")}>Create your free account <ArrowRight /></button></section>
  </>;
}

function Dashboard({ completed, account, sessionReady, onOpenCourse, onOpenLesson, onNavigate }: { completed: string[]; account: Account | null; sessionReady: boolean; onOpenCourse: (code: string) => void; onOpenLesson: (lesson: Lesson) => void; onNavigate: (view: View) => void }) {
  const a1 = getCourse("A1");
  const a1Progress = progressForCourse(a1, completed);
  const nextLesson = courseLessons(a1).find((lesson) => !completed.includes(lesson.id)) ?? courseLessons(a1)[0];
  const totalCompleted = courses.flatMap(courseLessons).filter((lesson) => completed.includes(lesson.id)).length;
  const firstName = account?.name.trim().split(/\s+/)[0];
  return <section className="app-shell shell"><div className="app-intro"><div><p className="eyebrow">Your learning space</p><h1>{firstName ? `Good to see you, ${firstName}.` : "Good to see you."}</h1><p>{sessionReady && !account ? "Explore a lesson below, then create a free account to save every milestone." : "One focused lesson is all it takes to keep your German moving forward."}</p></div><div className="streak-card"><Sparkles /><div><strong>7-day streak</strong><span>Keep it going today</span></div></div></div>
    <div className="dashboard-grid"><article className="continue-card"><div className="continue-card-top"><span>Continue learning</span><small>A1 · Foundations</small></div><h2>{nextLesson.title}</h2><p>{nextLesson.description}</p><div className="progress-label"><span>{a1Progress.done} of {a1Progress.total} lessons complete</span><strong>{a1Progress.percent}%</strong></div><div className="progress-bar"><span style={{ width: `${Math.max(a1Progress.percent, 8)}%` }} /></div><button className="light-button" onClick={() => onOpenLesson(nextLesson)}>Continue lesson <ArrowRight /></button></article>
      <article className="goal-card"><Target /><p>Daily goal</p><h2>10 minutes</h2><span>One lesson is usually enough.</span><button onClick={() => onNavigate("pricing")}>Set your goal <ChevronRight /></button></article>
      <article className="review-card"><div className="review-icon"><BookOpen /></div><p>Review queue</p><h2>12 words due</h2><span>Keep tricky vocabulary fresh with a quick review.</span><button className="secondary-button compact-button" onClick={() => onOpenLesson(nextLesson)}>Review now <ArrowRight /></button></article>
    </div>
    <section className="dashboard-section"><div className="dashboard-heading"><div><p className="eyebrow">Your courses</p><h2>Keep your momentum</h2></div><span>{totalCompleted} lessons completed</span></div><div className="course-progress-grid">{courses.map((course) => { const progress = progressForCourse(course, completed); return <button className="course-progress-card" style={{ "--accent": course.accent } as CSSProperties} key={course.code} onClick={() => onOpenCourse(course.code)}><span className="progress-course-code">{course.code}</span><div><small>{course.access === "premium" ? "Premium course" : "Included free"}</small><h3>{course.title}</h3><p>{progress.done}/{progress.total} lessons</p></div><div className="course-progress-ring"><strong>{progress.percent}%</strong></div></button>; })}</div></section>
  </section>;
}

function CourseMap({ course, completed, premium, onBack, onOpenLesson, onNavigate }: { course: Course; completed: string[]; premium: boolean; onBack: () => void; onOpenLesson: (lesson: Lesson) => void; onNavigate: (view: View) => void }) {
  const progress = progressForCourse(course, completed);
  return <section className="course-page shell"><button className="back-button" onClick={onBack}><ArrowLeft /> Back to dashboard</button><header className="course-hero" style={{ "--course-accent": course.accent } as CSSProperties}><div><p className="eyebrow">{course.code} · {course.access === "premium" ? "Premium" : "Included free"}</p><h1>{course.title}</h1><p>{course.description}</p></div><div className="course-hero-progress"><span>{progress.done} / {progress.total}</span><strong>Lessons complete</strong><div className="progress-bar"><span style={{ width: `${progress.percent}%` }} /></div></div></header><div className="course-units">{course.units.map((unit, unitIndex) => <section className="unit-card" key={unit.id}><div className="unit-heading"><span>Unit {unitIndex + 1}</span><div><h2>{unit.title}</h2><p>{unit.outcome}</p></div></div><div className="lesson-list">{unit.lessons.map((lesson) => { const status = lessonStatus(course, lesson, completed, premium); return <button className={`lesson-row ${status}`} key={lesson.id} onClick={() => onOpenLesson(lesson)}><span className="lesson-status"><StatusIcon status={status} /></span><span className="lesson-row-copy"><strong>{lesson.title}</strong><small>{lesson.description}</small></span><span className="lesson-duration"><Clock3 /> {lesson.duration} min</span>{status === "locked" ? <Crown className="premium-icon" /> : <ChevronRight />}</button>; })}</div></section>)}</div>{course.access === "premium" && !premium && <aside className="premium-gate"><Crown /><div><p>Unlock {course.code} and every course</p><h2>Make German your everyday language.</h2><span>Unlimited lessons, reviews and learning insights from one premium plan.</span></div><button className="primary-button" onClick={() => onNavigate("pricing")}>See Premium <ArrowRight /></button></aside>}</section>;
}

function LessonPlayer({ course, lesson, signedIn, onBack, onComplete }: { course: Course; lesson: Lesson; signedIn: boolean; onBack: () => void; onComplete: () => void }) {
  const [remoteLesson, setRemoteLesson] = useState<RemoteLesson | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [serverResult, setServerResult] = useState<{ correct: boolean; explanation: string } | null>(null);

  useEffect(() => {
    let active = true;
    setRemoteLesson(null);
    setSelected(null);
    setChecked(false);
    setChecking(false);
    setAttemptError(null);
    setServerResult(null);
    if (!signedIn) return () => { active = false; };

    void getRemoteLesson(lesson.id)
      .then((result) => { if (active) setRemoteLesson(result.lesson); })
      .catch((error) => {
        // Existing lesson pages are intentionally available as a useful preview
        // until their legacy content has been imported into the API catalog.
        if (active && error instanceof ApiError && error.status === 403) setAttemptError("This activity is part of Deutschio Premium.");
      });
    return () => { active = false; };
  }, [lesson.id, signedIn]);

  const localPrompt = prompts[lesson.id] ?? fallbackPrompt;
  const remoteExercise = remoteLesson?.exercises[0];
  const prompt: PracticePrompt = remoteExercise
    ? { german: remoteExercise.prompt, translation: "", options: remoteExercise.options, tip: remoteExercise.explanation }
    : localPrompt;
  const vocabulary = remoteLesson?.blocks.flatMap((block) => block.items?.map((item) => item.german) ?? []) ?? lesson.vocabulary;
  const correct = serverResult?.correct ?? selected === prompt.translation;
  const explanation = serverResult?.explanation ?? prompt.tip;

  const checkAnswer = async () => {
    if (!selected) return;
    setAttemptError(null);
    if (remoteLesson && remoteExercise) {
      setChecking(true);
      try {
        const result = await submitAttempt(remoteLesson.slug, remoteExercise.id, selected);
        setServerResult(result.result);
        setChecked(true);
      } catch (error) {
        setAttemptError(error instanceof ApiError ? error.message : "We could not save that answer. Please try again.");
      } finally {
        setChecking(false);
      }
      return;
    }
    setChecked(true);
  };

  const retry = () => {
    setSelected(null);
    setChecked(false);
    setServerResult(null);
    setAttemptError(null);
  };

  return <section className="lesson-page shell">
    <button className="back-button" onClick={onBack}><ArrowLeft /> Back to {course.code}</button>
    <header className="lesson-header">
      <span>{course.code} · {remoteLesson?.title ?? lesson.title}</span>
      <div><small>{remoteLesson ? "Saved lesson activity" : "Lesson preview"}</small><div className="lesson-progress"><span /></div></div>
    </header>
    {remoteLesson?.blocks.length ? <section className="lesson-content" aria-label="Lesson content">
      {remoteLesson.blocks.map((block, index) => <div className="lesson-content-block" key={`${block.type}-${block.title ?? block.text ?? index}`}>
        {block.type === "heading" && block.title ? <h2>{block.title}</h2> : null}
        {block.type === "paragraph" && block.text ? <p>{block.text}</p> : null}
        {block.type === "vocabulary" && block.items ? <dl>{block.items.map((item) => <div key={item.german}><dt>{item.german}</dt><dd>{item.translation}</dd></div>)}</dl> : null}
      </div>)}
    </section> : null}
    <article className="lesson-stage">
      <p className="eyebrow">Listen and choose the matching phrase</p>
      <button type="button" className="audio-button" onClick={() => speakGerman(prompt.german)} aria-label={`Play pronunciation for ${prompt.german}`}><Volume2 /></button>
      <h1>{prompt.german}</h1>
      <p className="lesson-instruction">Choose the most natural English meaning.</p>
      <div className="answer-options">{prompt.options.map((option) => <button type="button" key={option} className={`${selected === option ? "selected" : ""} ${checked && correct && (remoteLesson ? option === selected : option === prompt.translation) ? "correct" : ""} ${checked && selected === option && !correct ? "incorrect" : ""}`} disabled={checked || checking} onClick={() => setSelected(option)}><span>{option}</span>{checked && correct && (remoteLesson ? option === selected : option === prompt.translation) && <Check />}</button>)}</div>
      {attemptError && <p className="auth-message error" role="alert">{attemptError}</p>}
      {checked ? <div className={`feedback ${correct ? "success" : "retry"}`}><div>{correct ? <CheckCircle2 /> : <Sparkles />}</div><div><strong>{correct ? "Exactly right." : "Almost — keep going."}</strong><p>{correct ? explanation : remoteLesson ? explanation : `The correct answer is “${prompt.translation}”. ${explanation}`}</p></div></div> : null}
      <div className="lesson-actions">{checked ? correct ? <button className="primary-button" onClick={onComplete}>Finish lesson <ArrowRight /></button> : <button className="secondary-button" onClick={retry}>Try again <ArrowRight /></button> : <button className="primary-button" disabled={!selected || checking} onClick={() => void checkAnswer()}>{checking ? "Saving answer…" : "Check answer"}<ArrowRight /></button>}</div>
      {!signedIn && <p className="lesson-save-note">Create a free account to save your lesson progress across devices.</p>}
    </article>
    <aside className="lesson-vocabulary"><span>In this lesson</span>{vocabulary.map((word) => <span key={word}>{word}</span>)}</aside>
  </section>;
}

function Pricing({ onNavigate }: { onNavigate: (view: View) => void }) {
  const features = ["Every A1–B2 course", "Unlimited lessons and reviews", "Personal progress insights", "Downloadable practice resources", "Future pronunciation practice"];
  return <section className="pricing-page shell"><div className="pricing-intro"><p className="eyebrow"><Crown size={16} /> Deutschio Premium</p><h1>Go further with every lesson.</h1><p>Start with the foundations for free, then unlock the complete German learning path when you are ready.</p></div><div className="pricing-grid"><article className="price-card"><span className="plan-label">Free</span><h2>Build your foundation</h2><p>Everything needed to begin a consistent German habit.</p><ul><li><Check /> A1 and A2 learning paths</li><li><Check /> Daily practice and basics review</li><li><Check /> Progress across your free courses</li></ul><button className="secondary-button" onClick={() => onNavigate("dashboard")}>Keep learning free</button></article><article className="price-card featured"><span className="plan-label">Premium</span><h2>Speak with confidence</h2><p>Every course, every review, and the tools that turn practice into progress.</p><ul>{features.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul><button className="primary-button" onClick={() => onNavigate("signup")}>Join the Premium waitlist <ArrowRight /></button><small>Payments will be enabled after the Stripe integration is configured.</small></article></div></section>;
}

function AuthScreen({ mode, onNavigate, onSignedIn }: { mode: "login" | "signup"; onNavigate: (view: View) => void; onSignedIn: (account: Account) => void }) {
  const isSignUp = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(new URLSearchParams(window.location.search).get("verified") ? "Your email is verified. You can sign in now." : null);
  const [pending, setPending] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [developmentVerificationUrl, setDevelopmentVerificationUrl] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setDevelopmentVerificationUrl(null);
    setPending(true);
    try {
      if (isSignUp) {
        const result = await signUp(email, password);
        setMessage(result.message);
        setUnverifiedEmail(email);
        setDevelopmentVerificationUrl(result.developmentVerificationUrl ?? null);
      } else {
        const result = await signIn(email, password);
        onSignedIn(result.user);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not reach Deutschio. Please try again.");
      if (caught instanceof ApiError && caught.code === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(email);
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    if (!unverifiedEmail) return;
    setError(null);
    setResendingVerification(true);
    try {
      const result = await resendVerification(unverifiedEmail);
      setMessage(result.message);
      setDevelopmentVerificationUrl(result.developmentVerificationUrl ?? null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not resend the verification email. Please try again.");
    } finally {
      setResendingVerification(false);
    }
  };

  return <section className="auth-page shell"><div className="auth-card">
    <button className="back-button" onClick={() => onNavigate("home")}><ArrowLeft /> Back to home</button>
    <p className="eyebrow">{isSignUp ? "Start your journey" : "Welcome back"}</p>
    <h1>{isSignUp ? "Learn German, one small win at a time." : "Continue your German."}</h1>
    <p className="auth-copy">{isSignUp ? "Create your free account to save progress and build a learning habit that lasts." : "Sign in to pick up exactly where you left off."}</p>
    <form onSubmit={submit} className="auth-form">
      <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>Password<input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} required />{isSignUp && <small>Use at least 10 characters.</small>}</label>
      {error && <p className="auth-message error" role="alert">{error}</p>}
      {message && <p className="auth-message success" role="status">{message}</p>}
      <button className="primary-button" type="submit" disabled={pending}>{pending ? "One moment…" : isSignUp ? "Create free account" : "Sign in"}<ArrowRight /></button>
    </form>
    {unverifiedEmail ? <div className="verification-actions">
      <p>Didn&apos;t receive the verification email?</p>
      {developmentVerificationUrl ? <a href={developmentVerificationUrl}>Complete local verification</a> : <button type="button" onClick={() => void resend()} disabled={resendingVerification}>{resendingVerification ? "Sending…" : "Resend verification email"}</button>}
    </div> : null}
    <p className="auth-switch">{isSignUp ? "Already learning with Deutschio?" : "New to Deutschio?"} <button onClick={() => onNavigate(isSignUp ? "login" : "signup")}>{isSignUp ? "Sign in" : "Create a free account"}</button></p>
  </div></section>;
}

function Footer({ onNavigate }: { onNavigate: (view: View) => void }) {
  return <footer className="site-footer shell"><button className="brand brand-button" onClick={() => onNavigate("home")} aria-label="Deutschio home"><BrandLogo /></button><p>Learn clearly. Practice consistently. Speak confidently.</p><span>© {new Date().getFullYear()} Deutschio</span></footer>;
}
