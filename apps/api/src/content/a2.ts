import type { CatalogExercise, CatalogLesson, ExerciseOption, Translation, VocabularyItem } from "./a1.js";

type ItemRow = [german: string, english: string, arabic: string];
type LessonRow = [slug: string, title: string, summary: string, minutes: number, items: ItemRow[], answerIndex: number];

const translation = (en: string, ar: string): Translation => ({ en, ar });

function lesson([slug, title, summary, durationMinutes, rows, answerIndex]: LessonRow, position: number): CatalogLesson {
  const items: VocabularyItem[] = rows.map(([german, en, ar]) => ({ german, translations: translation(en, ar) }));
  const answer = items[answerIndex];
  if (!answer) throw new Error(`A2 lesson ${slug} needs vocabulary`);
  const options: ExerciseOption[] = items.map((item, index) => ({ id: `${slug}-${index}`, translations: item.translations }));
  const exercise: CatalogExercise = {
    id: `${slug}-meaning`, kind: "multiple_choice", prompt: answer.german, options,
    answer: `${slug}-${answerIndex}`,
    explanation: translation(`${answer.german} means “${answer.translations.en}”.`, `${answer.german} تعني «${answer.translations.ar}».`),
    points: 10,
  };
  return {
    slug, title, summary, position, durationMinutes,
    blocks: [
      { type: "heading", title },
      { type: "paragraph", text: `${summary} Read the phrases as they would be used in daily life, say them aloud, then choose the matching meaning.` },
      { type: "vocabulary", items },
    ],
    exercises: [exercise],
  };
}

// A2 uses complete, useful exchanges: independent travel, everyday services,
// work and connected stories. The Arabic and English translations are stored
// alongside the German so changing a learner preference never affects progress.
const rows: LessonRow[] = [
  ["a2-travel", "Planning a trip", "Compare travel options and make a clear plan.", 13, [
    ["Ich möchte die Reise online buchen.", "I would like to book the trip online.", "أود حجز الرحلة عبر الإنترنت."],
    ["Der Zug fährt morgen früh ab.", "The train leaves tomorrow morning.", "القطار يغادر صباح الغد."],
    ["Wann kommen wir in München an?", "When do we arrive in Munich?", "متى نصل إلى ميونخ؟"],
    ["Die günstigste Verbindung dauert vier Stunden.", "The cheapest connection takes four hours.", "أرخص رحلة تستغرق أربع ساعات."],
  ], 3],
  ["a2-tickets", "Tickets and platforms", "Buy a ticket and find the right platform with confidence.", 12, [
    ["Von welchem Gleis fährt der Zug?", "Which platform does the train leave from?", "من أي رصيف يغادر القطار؟"],
    ["Sie müssen in Köln umsteigen.", "You have to change trains in Cologne.", "عليك تغيير القطار في كولونيا."],
    ["Ist diese Verbindung noch gültig?", "Is this connection still valid?", "هل هذا المسار ما زال صالحاً؟"],
    ["Ich brauche eine Fahrkarte für die Rückfahrt.", "I need a ticket for the return journey.", "أحتاج تذكرة لرحلة العودة."],
  ], 1],
  ["a2-hotel", "At the hotel", "Check in, ask practical questions and solve a small hotel problem.", 13, [
    ["Ich habe ein Zimmer auf den Namen Karim reserviert.", "I have reserved a room under the name Karim.", "حجزت غرفة باسم كريم."],
    ["Ist das Frühstück im Preis enthalten?", "Is breakfast included in the price?", "هل الإفطار مشمول في السعر؟"],
    ["Könnte ich bitte noch einen Schlüssel bekommen?", "Could I have another key, please?", "هل يمكنني الحصول على مفتاح إضافي من فضلك؟"],
    ["Das Zimmer ist leider noch nicht fertig.", "Unfortunately, the room is not ready yet.", "للأسف، الغرفة ليست جاهزة بعد."],
  ], 0],
  ["a2-travel-problems", "When plans change", "Explain a delay or problem and ask calmly for help.", 14, [
    ["Mein Zug hat zwanzig Minuten Verspätung.", "My train is twenty minutes late.", "قطاري متأخر عشرين دقيقة."],
    ["Ich habe den Anschluss verpasst.", "I missed the connection.", "فاتتني الرحلة المتصلة."],
    ["Mein Koffer ist kaputt gegangen.", "My suitcase has broken.", "حقيبتي تعطلت."],
    ["Können Sie mir bitte helfen?", "Can you help me, please?", "هل يمكنك مساعدتي من فضلك؟"],
  ], 1],
  ["a2-food", "Food and cafés", "Order a meal, make a request and pay naturally.", 12, [
    ["Ich würde gern etwas Vegetarisches bestellen.", "I would like to order something vegetarian.", "أود طلب شيء نباتي."],
    ["Könnten wir bitte die Rechnung bekommen?", "Could we have the bill, please?", "هل يمكننا الحصول على الفاتورة من فضلك؟"],
    ["Das Gericht schmeckt wirklich gut.", "The dish tastes really good.", "الطبق لذيذ حقاً."],
    ["Kann ich mit Karte bezahlen?", "Can I pay by card?", "هل يمكنني الدفع بالبطاقة؟"],
  ], 0],
  ["a2-cooking", "Cooking at home", "Follow a simple recipe and talk about ingredients.", 13, [
    ["Das Rezept ist einfacher, als ich dachte.", "The recipe is easier than I thought.", "الوصفة أسهل مما ظننت."],
    ["Schneide das Gemüse in kleine Stücke.", "Cut the vegetables into small pieces.", "قطّع الخضار إلى قطع صغيرة."],
    ["Wir lassen die Suppe zehn Minuten kochen.", "We let the soup cook for ten minutes.", "نترك الحساء يطبخ لمدة عشر دقائق."],
    ["Hast du noch Salz und Pfeffer?", "Do you still have salt and pepper?", "هل لديك المزيد من الملح والفلفل؟"],
  ], 2],
  ["a2-shopping", "Clothes and shopping", "Ask about fit, price and alternatives when shopping.", 13, [
    ["Kann ich diese Jacke anprobieren?", "Can I try this jacket on?", "هل يمكنني تجربة هذه السترة؟"],
    ["Die Schuhe passen mir leider nicht.", "Unfortunately, the shoes do not fit me.", "للأسف، الحذاء لا يناسبني."],
    ["Gibt es das auch in einer anderen Farbe?", "Is that also available in another colour?", "هل يوجد هذا بلون آخر أيضاً؟"],
    ["Das ist mir ein bisschen zu teuer.", "That is a little too expensive for me.", "هذا غالٍ قليلاً بالنسبة لي."],
  ], 1],
  ["a2-returns", "Returns and exchanges", "Explain a purchase problem and ask for an exchange.", 14, [
    ["Ich möchte diesen Pullover umtauschen.", "I would like to exchange this jumper.", "أود استبدال هذه السترة."],
    ["Hier ist der Kassenbon.", "Here is the receipt.", "هذا هو الإيصال."],
    ["Die Größe ist leider zu klein.", "Unfortunately, the size is too small.", "للأسف، المقاس صغير جداً."],
    ["Kann ich das Geld zurückbekommen?", "Can I get my money back?", "هل يمكنني استرداد أموالي؟"],
  ], 3],
  ["a2-apartment", "Looking for a home", "Describe an apartment and ask the questions that matter.", 14, [
    ["Die Wohnung liegt in einer ruhigen Straße.", "The apartment is on a quiet street.", "تقع الشقة في شارع هادئ."],
    ["Wie hoch ist die monatliche Miete?", "How high is the monthly rent?", "كم يبلغ الإيجار الشهري؟"],
    ["Ist die Wohnung noch frei?", "Is the apartment still available?", "هل الشقة ما زالت متاحة؟"],
    ["Können wir die Wohnung am Samstag besichtigen?", "Can we view the apartment on Saturday?", "هل يمكننا معاينة الشقة يوم السبت؟"],
  ], 3],
  ["a2-neighbourhood", "Your neighbourhood", "Talk about the area where you live and what is nearby.", 12, [
    ["Ich wohne in einer sehr ruhigen Gegend.", "I live in a very quiet area.", "أعيش في منطقة هادئة جداً."],
    ["Ein Supermarkt ist ganz in der Nähe.", "A supermarket is very nearby.", "يوجد سوبرماركت قريب جداً."],
    ["Die Lage ist für mich sehr praktisch.", "The location is very practical for me.", "الموقع مناسب جداً بالنسبة لي."],
    ["Abends ist es hier oft ziemlich lebendig.", "It is often quite lively here in the evenings.", "غالباً ما تكون المنطقة حيوية في المساء."],
  ], 2],
  ["a2-appointments", "Making an appointment", "Arrange, confirm or move an appointment politely.", 13, [
    ["Hätten Sie am Donnerstag einen Termin frei?", "Would you have an appointment free on Thursday?", "هل لديكم موعد متاح يوم الخميس؟"],
    ["Um drei Uhr bin ich leider nicht verfügbar.", "Unfortunately, I am not available at three o’clock.", "للأسف، لست متاحاً الساعة الثالثة."],
    ["Können wir den Termin verschieben?", "Can we postpone the appointment?", "هل يمكننا تأجيل الموعد؟"],
    ["Freitagvormittag würde mir gut passen.", "Friday morning would suit me well.", "صباح الجمعة يناسبني جيداً."],
  ], 2],
  ["a2-health", "At the doctor", "Describe symptoms and understand simple medical advice.", 14, [
    ["Ich habe seit zwei Tagen starke Kopfschmerzen.", "I have had a bad headache for two days.", "لدي صداع شديد منذ يومين."],
    ["Der Arzt schreibt mir ein Rezept.", "The doctor is writing me a prescription.", "الطبيب يكتب لي وصفة طبية."],
    ["Sie sollten sich heute ausruhen.", "You should rest today.", "يجب أن ترتاح اليوم."],
    ["Tut es weh, wenn Sie hier drücken?", "Does it hurt when you press here?", "هل يؤلمك عندما تضغط هنا؟"],
  ], 2],
  ["a2-work", "Workday conversations", "Talk about tasks, colleagues and a busy workday.", 13, [
    ["Ich muss diese Aufgabe heute noch erledigen.", "I still have to complete this task today.", "عليّ إنهاء هذه المهمة اليوم."],
    ["Wollen wir das in der Pause besprechen?", "Shall we discuss that during the break?", "هل نناقش ذلك أثناء الاستراحة؟"],
    ["Meine Kollegin ist gerade beschäftigt.", "My colleague is busy right now.", "زميلتي مشغولة الآن."],
    ["Ich schicke dir die Unterlagen per E-Mail.", "I will send you the documents by email.", "سأرسل لك المستندات عبر البريد الإلكتروني."],
  ], 1],
  ["a2-study", "Learning and study", "Explain what you are learning and ask for clarification.", 12, [
    ["Ich übe jeden Abend ein bisschen Deutsch.", "I practise a little German every evening.", "أتدرّب على الألمانية قليلاً كل مساء."],
    ["Ich habe diese Aufgabe nicht ganz verstanden.", "I did not completely understand this task.", "لم أفهم هذه المهمة تماماً."],
    ["Die Prüfung findet nächste Woche statt.", "The exam takes place next week.", "الامتحان يُعقد الأسبوع القادم."],
    ["Können Sie das bitte noch einmal erklären?", "Could you explain that once more, please?", "هل يمكنكم شرح ذلك مرة أخرى من فضلكم؟"],
  ], 3],
  ["a2-invitations", "Invitations and events", "Invite someone and accept or decline in a friendly way.", 13, [
    ["Möchtest du am Samstag mitkommen?", "Would you like to come along on Saturday?", "هل ترغب في المجيء يوم السبت؟"],
    ["Ich hätte auf jeden Fall Lust darauf.", "I would definitely like to do that.", "بالتأكيد أرغب في ذلك."],
    ["Leider habe ich an dem Abend schon etwas vor.", "Unfortunately, I already have plans that evening.", "للأسف، لدي خطط مسبقة ذلك المساء."],
    ["Danke für die Einladung, das ist sehr nett.", "Thank you for the invitation, that is very kind.", "شكراً على الدعوة، هذا لطف كبير منك."],
  ], 2],
  ["a2-feelings", "Feelings and reactions", "Say how you feel and respond naturally to other people.", 12, [
    ["Ich war von der Nachricht wirklich überrascht.", "I was really surprised by the news.", "تفاجأت حقاً بالخبر."],
    ["Mit dem Ergebnis bin ich sehr zufrieden.", "I am very satisfied with the result.", "أنا راضٍ جداً عن النتيجة."],
    ["Das ist schade, aber kein Problem.", "That is a shame, but no problem.", "هذا مؤسف، لكن لا مشكلة."],
    ["Das freut mich wirklich für dich.", "I am really happy for you.", "أنا سعيد جداً من أجلك."],
  ], 3],
  ["a2-weekend", "Talking about the weekend", "Tell a short, clear story about your weekend.", 14, [
    ["Zuerst haben wir im Park gefrühstückt.", "First, we had breakfast in the park.", "أولاً، تناولنا الإفطار في الحديقة."],
    ["Danach sind wir durch die Stadt gelaufen.", "Afterwards, we walked through the city.", "بعد ذلك، مشينا عبر المدينة."],
    ["Später hat es plötzlich angefangen zu regnen.", "Later, it suddenly started to rain.", "لاحقاً، بدأت السماء تمطر فجأة."],
    ["Am Ende waren wir trotzdem sehr zufrieden.", "In the end, we were still very pleased.", "في النهاية، كنا سعداء رغم ذلك."],
  ], 2],
  ["a2-memories", "Past experiences", "Share a memory using clear past-time language.", 15, [
    ["Früher habe ich in einer kleinen Stadt gelebt.", "I used to live in a small town.", "كنت أعيش سابقاً في مدينة صغيرة."],
    ["Damals kannte ich dort noch niemanden.", "At that time, I did not know anyone there yet.", "في ذلك الوقت، لم أكن أعرف أحداً هناك بعد."],
    ["Plötzlich habe ich eine alte Freundin getroffen.", "Suddenly, I met an old friend.", "فجأة، قابلت صديقة قديمة."],
    ["Das war eine Erfahrung, die ich nie vergesse.", "That was an experience I will never forget.", "كانت تجربة لن أنساها أبداً."],
  ], 0],
  ["a2-future", "Plans for the future", "Discuss wishes, plans and next steps.", 13, [
    ["Nächstes Jahr möchte ich nach Deutschland reisen.", "Next year I would like to travel to Germany.", "أود السفر إلى ألمانيا العام المقبل."],
    ["Ich habe vor, einen Sprachkurs zu machen.", "I intend to take a language course.", "أنوي الالتحاق بدورة لغة."],
    ["Hoffentlich finde ich bald eine passende Wohnung.", "Hopefully, I will find a suitable apartment soon.", "آمل أن أجد شقة مناسبة قريباً."],
    ["Wir planen, im Sommer umzuziehen.", "We are planning to move in summer.", "نخطط للانتقال في الصيف."],
  ], 1],
  ["a2-opinions", "Giving an opinion", "Agree or disagree and give a short, clear reason.", 14, [
    ["Ich finde, dass die Idee gut ist.", "I think the idea is good.", "أرى أن الفكرة جيدة."],
    ["Meiner Meinung nach ist das zu teuer.", "In my opinion, that is too expensive.", "في رأيي، هذا مكلف جداً."],
    ["Ich stimme dir zu, weil es praktisch ist.", "I agree with you because it is practical.", "أوافقك لأن ذلك عملي."],
    ["Da bin ich nicht ganz deiner Meinung.", "I do not completely share your opinion on that.", "لا أوافقك تماماً في هذا الرأي."],
  ], 2],
  ["a2-media", "News and media", "Talk about something you read, watched or heard.", 13, [
    ["Ich habe heute Morgen die Nachrichten gelesen.", "I read the news this morning.", "قرأت الأخبار هذا الصباح."],
    ["Der Artikel war überraschend interessant.", "The article was surprisingly interesting.", "كان المقال مثيراً للاهتمام بشكل مفاجئ."],
    ["Darüber wurde gestern im Radio berichtet.", "It was reported on the radio yesterday.", "تم الإبلاغ عن ذلك في الراديو أمس."],
    ["Ich schaue mir die Sendung später an.", "I will watch the programme later.", "سأشاهد البرنامج لاحقاً."],
  ], 1],
  ["a2-culture", "Culture and recommendations", "Recommend an event, place or film with a reason.", 13, [
    ["Ich kann dir diese Ausstellung sehr empfehlen.", "I can highly recommend this exhibition to you.", "أنصحك كثيراً بزيارة هذا المعرض."],
    ["Der Film war spannender als erwartet.", "The film was more exciting than expected.", "كان الفيلم أكثر تشويقاً مما توقعت."],
    ["Wollen wir das Museum zusammen besuchen?", "Shall we visit the museum together?", "هل نزور المتحف معاً؟"],
    ["Die Veranstaltung beginnt um acht Uhr.", "The event begins at eight o’clock.", "تبدأ الفعالية الساعة الثامنة."],
  ], 0],
  ["a2-nature", "Nature and weather", "Describe an outing and talk about the environment.", 12, [
    ["Wir sind gestern im Wald spazieren gegangen.", "We went for a walk in the forest yesterday.", "ذهبنا في نزهة في الغابة أمس."],
    ["Die Luft dort war besonders sauber.", "The air there was especially clean.", "كان الهواء هناك نظيفاً بشكل خاص."],
    ["Mir ist der Schutz der Umwelt wichtig.", "Protecting the environment is important to me.", "حماية البيئة مهمة بالنسبة لي."],
    ["Trotz des Wetters war der Ausflug schön.", "Despite the weather, the outing was nice.", "رغم الطقس، كانت النزهة جميلة."],
  ], 2],
  ["a2-everyday-confidence", "Everyday confidence", "Handle a longer everyday conversation with calm confidence.", 15, [
    ["Entschuldigung, könnten Sie mir kurz helfen?", "Excuse me, could you help me briefly?", "عذراً، هل يمكنكم مساعدتي قليلاً؟"],
    ["Kein Problem, ich habe alles verstanden.", "No problem, I understood everything.", "لا مشكلة، لقد فهمت كل شيء."],
    ["Eigentlich suche ich nur die nächste Haltestelle.", "Actually, I am only looking for the next stop.", "في الواقع، أبحث فقط عن المحطة التالية."],
    ["Vielen Dank, das war sehr hilfreich.", "Thank you very much, that was very helpful.", "شكراً جزيلاً، كان ذلك مفيداً جداً."],
  ], 3],
];

export const a2Lessons = rows.map(lesson);
