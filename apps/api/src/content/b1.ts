import type { CatalogExercise, CatalogLesson, ExerciseOption, Translation, VocabularyItem } from "./a1.js";

type ItemRow = [german: string, english: string, arabic: string];
type LessonRow = [slug: string, title: string, summary: string, minutes: number, items: ItemRow[], answerIndex: number];

const translation = (en: string, ar: string): Translation => ({ en, ar });

function lesson([slug, title, summary, durationMinutes, rows, answerIndex]: LessonRow, position: number): CatalogLesson {
  const items: VocabularyItem[] = rows.map(([german, en, ar]) => ({ german, translations: translation(en, ar) }));
  const answer = items[answerIndex];
  if (!answer) throw new Error(`B1 lesson ${slug} needs vocabulary`);

  const options: ExerciseOption[] = items.map((item, index) => ({ id: `${slug}-${index}`, translations: item.translations }));
  const exercise: CatalogExercise = {
    id: `${slug}-meaning`,
    kind: "multiple_choice",
    prompt: answer.german,
    options,
    answer: `${slug}-${answerIndex}`,
    explanation: translation(
      `${answer.german} means “${answer.translations.en}”.`,
      `${answer.german} تعني «${answer.translations.ar}».`,
    ),
    points: 10,
  };

  return {
    slug,
    title,
    summary,
    position,
    durationMinutes,
    blocks: [
      { type: "heading", title },
      { type: "paragraph", text: `${summary} Read the phrases as connected, real-world German, then say them aloud before choosing the meaning.` },
      { type: "vocabulary", items },
    ],
    exercises: [exercise],
  };
}

// B1 shifts from isolated survival phrases to opinions and practical
// conversations. Each translation is stored in both learning languages so the
// learner's choice changes presentation, never their saved progress.
const rows: LessonRow[] = [
  ["b1-health", "Health and wellbeing", "Describe how you feel, ask for help and understand useful medical advice.", 14, [
    ["Ich fühle mich seit gestern nicht gut.", "I have not felt well since yesterday.", "لا أشعر أنني بخير منذ أمس."],
    ["Könnten Sie einen Termin für mich vereinbaren?", "Could you arrange an appointment for me?", "هل يمكنكم تحديد موعد لي؟"],
    ["Die Apotheke ist gleich um die Ecke.", "The pharmacy is just around the corner.", "الصيدلية على بعد خطوات."],
    ["Nehmen Sie diese Tabletten zweimal täglich.", "Take these tablets twice a day.", "تناول هذه الأقراص مرتين يومياً."],
  ], 0],
  ["b1-culture", "Culture and recommendations", "Recommend an exhibition or event and explain why it made an impression on you.", 13, [
    ["Die Ausstellung war wirklich beeindruckend.", "The exhibition was truly impressive.", "كان المعرض مؤثراً حقاً."],
    ["Ich würde dir den Film auf jeden Fall empfehlen.", "I would definitely recommend the film to you.", "أنصحك بالتأكيد بمشاهدة الفيلم."],
    ["Besonders interessant fand ich die Gespräche danach.", "I found the conversations afterwards especially interesting.", "وجدت النقاشات بعد ذلك مثيرة للاهتمام بشكل خاص."],
    ["Hast du schon etwas für das Wochenende geplant?", "Have you already planned something for the weekend?", "هل خططت لشيء في عطلة نهاية الأسبوع؟"],
  ], 1],
  ["b1-technology", "Technology and digital life", "Discuss digital habits, privacy and the tools that make everyday life easier.", 14, [
    ["Ich lade die Datei später herunter.", "I will download the file later.", "سأنزّل الملف لاحقاً."],
    ["Schick mir bitte eine Nachricht, wenn du fertig bist.", "Please send me a message when you are finished.", "أرسل لي رسالة من فضلك عندما تنتهي."],
    ["Mir ist wichtig, dass meine Daten sicher sind.", "It is important to me that my data is secure.", "من المهم بالنسبة لي أن تكون بياناتي آمنة."],
    ["Ohne Internet kann ich heute kaum arbeiten.", "Without the internet, I can hardly work today.", "بالكاد أستطيع العمل اليوم من دون الإنترنت."],
  ], 2],
];

export const b1Lessons = rows.map(lesson);
