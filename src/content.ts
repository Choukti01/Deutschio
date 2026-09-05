export type Access = "free" | "premium";
export type LessonStatus = "completed" | "current" | "available" | "locked";

export type Lesson = {
  id: string;
  title: string;
  description: string;
  duration: number;
  access: Access;
  vocabulary: string[];
};

export type Unit = {
  id: string;
  title: string;
  outcome: string;
  lessons: Lesson[];
};

export type Course = {
  code: "A1" | "A2" | "B1" | "B2";
  title: string;
  description: string;
  accent: string;
  access: Access;
  units: Unit[];
};

export const courses: Course[] = [
  {
    code: "A1",
    title: "First conversations",
    description: "Build confidence with greetings, family, numbers and everyday essentials.",
    accent: "#d6ff58",
    access: "free",
    units: [
      {
        id: "a1-first-conversations",
        title: "First conversations",
        outcome: "Greet people, introduce yourself and handle simple exchanges.",
        lessons: [
          { id: "a1-greetings", title: "Hello and goodbye", description: "Meet the everyday German greetings you will hear first.", duration: 8, access: "free", vocabulary: ["Hallo", "Guten Morgen", "Tschüss"] },
          { id: "a1-introductions", title: "Introduce yourself", description: "Say who you are and ask someone their name.", duration: 10, access: "free", vocabulary: ["Ich heiße", "Wie heißt du?", "Freut mich"] },
          { id: "a1-simple-questions", title: "Simple questions", description: "Ask and understand the questions that keep a conversation moving.", duration: 9, access: "free", vocabulary: ["Wie geht's?", "Woher kommst du?", "Bitte"] },
        ],
      },
      {
        id: "a1-everyday-people",
        title: "People around you",
        outcome: "Talk about the people and routines that shape your day.",
        lessons: [
          { id: "a1-family", title: "Family", description: "Name family members and describe simple relationships.", duration: 11, access: "free", vocabulary: ["die Mutter", "der Vater", "die Familie"] },
          { id: "a1-numbers", title: "Numbers", description: "Use numbers confidently in everyday situations.", duration: 9, access: "free", vocabulary: ["eins", "zehn", "zwanzig"] },
          { id: "a1-days", title: "Days and time", description: "Make simple plans using days of the week and time words.", duration: 10, access: "free", vocabulary: ["Montag", "heute", "morgen"] },
        ],
      },
    ],
  },
  {
    code: "A2",
    title: "Everyday independence",
    description: "Navigate travel, food, shopping and the conversations of daily life.",
    accent: "#71e1ff",
    access: "free",
    units: [
      { id: "a2-life", title: "Life in motion", outcome: "Handle common moments when you travel, shop and make plans.", lessons: [
        { id: "a2-travel", title: "Travel", description: "Find your way, buy tickets and ask for directions.", duration: 12, access: "free", vocabulary: ["der Bahnhof", "links", "geradeaus"] },
        { id: "a2-food", title: "Food and cafés", description: "Order a meal and talk about what you like.", duration: 11, access: "free", vocabulary: ["das Brot", "lecker", "bezahlen"] },
        { id: "a2-shopping", title: "Shopping", description: "Ask for sizes, prices and everyday items.", duration: 11, access: "free", vocabulary: ["wie viel", "die Größe", "kaufen"] },
      ] },
    ],
  },
  {
    code: "B1",
    title: "Speak with confidence",
    description: "Express opinions about culture, health, technology and the environment.",
    accent: "#ffb66d",
    access: "premium",
    units: [
      { id: "b1-opinions", title: "Ideas and opinions", outcome: "Explain your point of view in connected conversations.", lessons: [
        { id: "b1-health", title: "Health", description: "Talk about wellbeing and make appointments.", duration: 14, access: "premium", vocabulary: ["gesund", "die Apotheke", "sich fühlen"] },
        { id: "b1-culture", title: "Culture", description: "Share recommendations and discuss experiences.", duration: 13, access: "premium", vocabulary: ["die Ausstellung", "empfehlen", "interessant"] },
        { id: "b1-technology", title: "Technology", description: "Speak about connected life and digital habits.", duration: 14, access: "premium", vocabulary: ["die Nachricht", "herunterladen", "sicher"] },
      ] },
    ],
  },
  {
    code: "B2",
    title: "Fluent expression",
    description: "Handle nuanced subjects including science, economics, law and public speaking.",
    accent: "#dc9cff",
    access: "premium",
    units: [
      { id: "b2-advanced", title: "Advanced expression", outcome: "Understand and express complex ideas with clarity.", lessons: [
        { id: "b2-science", title: "Science", description: "Discuss discoveries, evidence and change.", duration: 17, access: "premium", vocabulary: ["die Forschung", "nachweisen", "die Erkenntnis"] },
        { id: "b2-economics", title: "Economics", description: "Follow and contribute to conversations about work and society.", duration: 16, access: "premium", vocabulary: ["die Nachfrage", "wachsen", "die Ausgabe"] },
        { id: "b2-public-speaking", title: "Public speaking", description: "Structure an argument and present it with confidence.", duration: 18, access: "premium", vocabulary: ["behaupten", "überzeugen", "zusammenfassen"] },
      ] },
    ],
  },
];

export const courseLevels = courses.map((course) => ({
  code: course.code,
  title: course.title,
  description: course.description,
  lessons: course.units.reduce((count, unit) => count + unit.lessons.length, 0),
  accent: course.accent,
  access: course.access,
}));

export function getCourse(code: string | null) {
  return courses.find((course) => course.code === code) ?? courses[0];
}

export function getLesson(course: Course, lessonId: string | null) {
  return course.units.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === lessonId);
}
