export type LearningLanguage = "en" | "ar";
export type Translation = Record<LearningLanguage, string>;
export type VocabularyItem = { german: string; translations: Translation };
export type ExerciseOption = { id: string; translations: Translation };
export type CatalogExercise = {
  id: string;
  kind: "multiple_choice";
  prompt: string;
  options: ExerciseOption[];
  answer: string;
  explanation: Translation;
  points: number;
};
export type CatalogLesson = {
  slug: string;
  title: string;
  summary: string;
  position: number;
  durationMinutes: number;
  blocks: Array<{ type: "heading"; title: string } | { type: "paragraph"; text: string } | { type: "vocabulary"; items: VocabularyItem[] }>;
  exercises: CatalogExercise[];
};

type ItemRow = [german: string, english: string, arabic: string];
type LessonRow = [slug: string, title: string, summary: string, minutes: number, items: ItemRow[], answerIndex: number];

const translated = (en: string, ar: string): Translation => ({ en, ar });

function lesson([slug, title, summary, durationMinutes, rows, answerIndex]: LessonRow, position: number): CatalogLesson {
  const items = rows.map(([german, en, ar]) => ({ german, translations: translated(en, ar) }));
  const answer = items[answerIndex] ?? items[0];
  if (!answer) throw new Error(`A1 lesson ${slug} needs vocabulary`);
  return {
    slug,
    title,
    summary,
    position,
    durationMinutes,
    blocks: [
      { type: "heading", title },
      { type: "paragraph", text: `${summary} Listen to each phrase, notice the word order, and say it aloud before choosing its meaning.` },
      { type: "vocabulary", items },
    ],
    exercises: [{
      id: `${slug}-meaning`,
      kind: "multiple_choice",
      prompt: answer.german,
      options: items.map((item, index) => ({ id: `${slug}-${index}`, translations: item.translations })),
      answer: `${slug}-${answerIndex}`,
      explanation: translated(`${answer.german} means “${answer.translations.en}”.`, `${answer.german} تعني «${answer.translations.ar}».`),
      points: 10,
    }],
  };
}

// Every A1 lesson is deliberately anchored in a phrase a beginner can use in
// a real conversation. Arabic is stored alongside English now so a later UI
// language preference changes presentation, never the learning record.
const rows: LessonRow[] = [
  ["a1-greetings", "Hello and goodbye", "Use natural greetings from your first conversation.", 8, [["Hallo", "Hello", "مرحباً"], ["Guten Morgen", "Good morning", "صباح الخير"], ["Guten Abend", "Good evening", "مساء الخير"], ["Tschüss", "Bye", "إلى اللقاء"]], 1],
  ["a1-introductions", "Introduce yourself", "Say your name and make a warm first impression.", 10, [["Ich heiße Anna.", "My name is Anna.", "اسمي آنا."], ["Wie heißt du?", "What is your name?", "ما اسمك؟"], ["Mein Name ist Omar.", "My name is Omar.", "اسمي عمر."], ["Freut mich.", "Nice to meet you.", "سعيد بلقائك."]], 1],
  ["a1-how-are-you", "How are you?", "Ask how someone is and give a simple, natural answer.", 9, [["Wie geht es dir?", "How are you?", "كيف حالك؟"], ["Mir geht es gut.", "I am well.", "أنا بخير."], ["Ich bin müde.", "I am tired.", "أنا متعب."], ["Danke, und dir?", "Thanks, and you?", "شكراً، وأنت؟"]], 0],
  ["a1-polite-words", "Please and thank you", "Use everyday polite words with confidence.", 8, [["Danke schön.", "Thank you very much.", "شكراً جزيلاً."], ["Bitte.", "Please / You’re welcome.", "من فضلك / على الرحب والسعة."], ["Entschuldigung.", "Excuse me.", "عذراً."], ["Gern geschehen.", "You’re welcome.", "على الرحب والسعة."]], 2],
  ["a1-numbers", "Numbers 1–20", "Recognise numbers you hear in prices, times and phone numbers.", 10, [["eins", "one", "واحد"], ["zehn", "ten", "عشرة"], ["zwanzig", "twenty", "عشرون"], ["null", "zero", "صفر"]], 2],
  ["a1-clock", "What time is it?", "Ask and answer a basic question about the time.", 11, [["Wie spät ist es?", "What time is it?", "كم الساعة؟"], ["Es ist drei Uhr.", "It is three o’clock.", "الساعة الثالثة."], ["halb vier", "half past three", "الثالثة والنصف"], ["Viertel nach fünf", "quarter past five", "الخامسة والربع"]], 1],
  ["a1-days", "Days of the week", "Make a simple plan for today, tomorrow or the weekend.", 10, [["Heute ist Montag.", "Today is Monday.", "اليوم هو الاثنين."], ["Morgen habe ich Zeit.", "I have time tomorrow.", "لدي وقت غداً."], ["Am Wochenende arbeite ich nicht.", "I do not work at the weekend.", "لا أعمل في عطلة نهاية الأسبوع."], ["Bis morgen!", "See you tomorrow!", "أراك غداً!"]], 1],
  ["a1-dates", "Dates and birthdays", "Say a birthday and understand a simple date.", 10, [["Wann hast du Geburtstag?", "When is your birthday?", "متى عيد ميلادك؟"], ["Am ersten Mai.", "On the first of May.", "في الأول من مايو."], ["Mein Geburtstag ist im Mai.", "My birthday is in May.", "عيد ميلادي في مايو."], ["Heute ist der dritte Juni.", "Today is the third of June.", "اليوم هو الثالث من يونيو."]], 1],
  ["a1-family", "Family", "Talk about close family with the right German articles.", 11, [["Das ist meine Mutter.", "This is my mother.", "هذه أمي."], ["Mein Vater arbeitet heute.", "My father is working today.", "والدي يعمل اليوم."], ["Wir sind eine Familie.", "We are a family.", "نحن عائلة."], ["Das Kind spielt.", "The child is playing.", "الطفل يلعب."]], 0],
  ["a1-descriptions", "People and descriptions", "Describe people with simple, useful adjectives.", 10, [["Er ist groß.", "He is tall.", "هو طويل."], ["Sie ist sehr nett.", "She is very nice.", "هي لطيفة جداً."], ["Das Haus ist klein.", "The house is small.", "البيت صغير."], ["Mein Bruder ist jung.", "My brother is young.", "أخي صغير السن."]], 1],
  ["a1-home", "At home", "Name rooms and say where you are at home.", 12, [["Die Küche ist klein.", "The kitchen is small.", "المطبخ صغير."], ["Das Zimmer ist hell.", "The room is bright.", "الغرفة مشرقة."], ["Der Tisch steht hier.", "The table is here.", "الطاولة هنا."], ["Ich bin zu Hause.", "I am at home.", "أنا في المنزل."]], 3],
  ["a1-possessions", "My things", "Say what belongs to you and ask about an object.", 10, [["Das ist mein Handy.", "That is my phone.", "هذا هاتفي."], ["Ist das dein Schlüssel?", "Is that your key?", "هل هذا مفتاحك؟"], ["Mein Buch ist neu.", "My book is new.", "كتابي جديد."], ["Wo ist deine Tasche?", "Where is your bag?", "أين حقيبتك؟"]], 1],
  ["a1-routines", "A typical day", "Describe the key parts of a simple daily routine.", 12, [["Ich stehe um sieben Uhr auf.", "I get up at seven o’clock.", "أستيقظ في الساعة السابعة."], ["Ich arbeite heute.", "I am working today.", "أنا أعمل اليوم."], ["Wir essen um sechs.", "We eat at six.", "نحن نأكل في السادسة."], ["Ich schlafe früh.", "I sleep early.", "أنام مبكراً."]], 0],
  ["a1-weather", "Weather and seasons", "Make easy small talk about today’s weather.", 10, [["Heute ist es sonnig.", "It is sunny today.", "الجو مشمس اليوم."], ["Es ist kalt.", "It is cold.", "الجو بارد."], ["Es regnet.", "It is raining.", "إنها تمطر."], ["Der Sommer ist warm.", "Summer is warm.", "الصيف دافئ."]], 2],
  ["a1-hobbies", "Free time", "Say what you like doing and suggest an activity.", 11, [["Ich lese gern.", "I like reading.", "أحب القراءة."], ["Ich mache gern Sport.", "I like doing sport.", "أحب ممارسة الرياضة."], ["Wir lernen zusammen.", "We learn together.", "نتعلم معاً."], ["Was machst du gern?", "What do you like doing?", "ماذا تحب أن تفعل؟"]], 3],
  ["a1-simple-plans", "Making a plan", "Suggest a time and respond naturally to an invitation.", 12, [["Hast du heute Zeit?", "Do you have time today?", "هل لديك وقت اليوم؟"], ["Vielleicht später.", "Maybe later.", "ربما لاحقاً."], ["Ja, gern.", "Yes, gladly.", "نعم، بكل سرور."], ["Bis dann!", "See you then!", "إلى ذلك الحين!"]], 0],
  ["a1-food", "Food basics", "Ask for common food and say what you would like.", 12, [["Ich möchte ein Brot, bitte.", "I would like a bread roll, please.", "أود قطعة خبز، من فضلك."], ["Das Wasser ist kalt.", "The water is cold.", "الماء بارد."], ["Die Suppe ist lecker.", "The soup is delicious.", "الحساء لذيذ."], ["Was möchtest du essen?", "What would you like to eat?", "ماذا تود أن تأكل؟"]], 0],
  ["a1-cafe", "At the café", "Order a drink and understand a café question.", 11, [["Ich möchte einen Kaffee, bitte.", "I would like a coffee, please.", "أود قهوة، من فضلك."], ["Mit Milch, bitte.", "With milk, please.", "مع الحليب، من فضلك."], ["Sonst noch etwas?", "Anything else?", "أي شيء آخر؟"], ["Zum Mitnehmen, bitte.", "To take away, please.", "للسفري، من فضلك."]], 2],
  ["a1-shop", "In a shop", "Ask for a colour, size and price in a shop.", 12, [["Wie viel kostet das?", "How much does that cost?", "كم ثمن هذا؟"], ["Haben Sie das in Rot?", "Do you have that in red?", "هل لديكم هذا باللون الأحمر؟"], ["Welche Größe?", "Which size?", "أي مقاس؟"], ["Ich möchte das kaufen.", "I would like to buy that.", "أود شراء هذا."]], 0],
  ["a1-paying", "Paying and prices", "Pay politely and understand a simple total.", 10, [["Das kostet zehn Euro.", "That costs ten euros.", "هذا يكلف عشرة يورو."], ["Zahlen Sie bar oder mit Karte?", "Are you paying cash or by card?", "هل تدفع نقداً أم بالبطاقة؟"], ["Mit Karte, bitte.", "By card, please.", "بالبطاقة، من فضلك."], ["Zusammen, bitte.", "Together, please.", "معاً، من فضلك."]], 1],
  ["a1-places", "Places in town", "Recognise useful places in a new town.", 11, [["Der Bahnhof ist dort.", "The station is there.", "المحطة هناك."], ["Der Supermarkt ist offen.", "The supermarket is open.", "السوبرماركت مفتوح."], ["Wo ist die Apotheke?", "Where is the pharmacy?", "أين الصيدلية؟"], ["Das Hotel ist nah.", "The hotel is near.", "الفندق قريب."]], 2],
  ["a1-directions", "Finding the way", "Ask for and understand short directions.", 13, [["Gehen Sie geradeaus.", "Go straight ahead.", "اذهب مباشرة."], ["Dann links.", "Then left.", "ثم إلى اليسار."], ["Die Bank ist rechts.", "The bank is on the right.", "البنك على اليمين."], ["Wo ist der Bahnhof?", "Where is the station?", "أين المحطة؟"]], 3],
  ["a1-transport", "Bus and train", "Buy a ticket and understand basic transport language.", 12, [["Eine Fahrkarte nach Berlin, bitte.", "A ticket to Berlin, please.", "تذكرة إلى برلين، من فضلك."], ["Der Zug fährt um acht Uhr ab.", "The train leaves at eight o’clock.", "القطار يغادر الساعة الثامنة."], ["Der Bus kommt gleich an.", "The bus arrives soon.", "الحافلة ستصل قريباً."], ["Von welchem Gleis?", "From which platform?", "من أي رصيف؟"]], 0],
  ["a1-first-conversations", "First real conversations", "Combine your new language in a short, friendly conversation.", 14, [["Ich komme aus Marokko.", "I come from Morocco.", "أنا من المغرب."], ["Ich wohne in Paris.", "I live in Paris.", "أعيش في باريس."], ["Und du?", "And you?", "وأنت؟"], ["Sehr schön!", "Very nice!", "جميل جداً!"]], 2],
];

export const a1Lessons = rows.map(lesson);
