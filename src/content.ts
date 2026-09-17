export type Access = "free" | "premium";
export type LessonStatus = "completed" | "current" | "available" | "locked";
export type Lesson = { id: string; title: string; description: string; duration: number; access: Access; vocabulary: string[] };
export type Unit = { id: string; title: string; outcome: string; lessons: Lesson[] };
export type Course = { code: "A1" | "A2" | "B1" | "B2"; title: string; description: string; accent: string; access: Access; units: Unit[] };

type LessonRow = [string, string, string, number, string[]];
const lesson = ([id, title, description, duration, vocabulary]: LessonRow, access: Access = "free"): Lesson => ({ id, title, description, duration, vocabulary, access });
const unit = (id: string, title: string, outcome: string, rows: LessonRow[]): Unit => ({ id, title, outcome, lessons: rows.map((row) => lesson(row)) });

const a1Units: Unit[] = [
  unit("a1-first-words", "Your first words", "Open a friendly conversation and understand the essential replies.", [
    ["a1-greetings", "Hello and goodbye", "Use natural greetings for every part of the day.", 8, ["Hallo", "Guten Morgen", "Guten Abend", "Tschüss"]],
    ["a1-introductions", "Introduce yourself", "Say your name, ask a name and make a good first impression.", 10, ["Ich heiße", "Wie heißt du?", "Freut mich", "Mein Name ist"]],
    ["a1-how-are-you", "How are you?", "Ask how someone is and answer with confidence.", 9, ["Wie geht es dir?", "gut", "müde", "danke"]],
    ["a1-polite-words", "Please and thank you", "Use the small polite words that make German warmer.", 8, ["bitte", "danke", "Entschuldigung", "gern"]],
  ]),
  unit("a1-time-and-numbers", "Time and numbers", "Handle prices, dates and simple plans without hesitation.", [
    ["a1-numbers", "Numbers 1–20", "Recognise, say and hear the numbers used every day.", 10, ["eins", "zehn", "zwanzig", "null"]],
    ["a1-clock", "What time is it?", "Ask and tell the time for everyday plans.", 11, ["Wie spät ist es?", "Uhr", "halb", "Viertel"]],
    ["a1-days", "Days of the week", "Make plans for today, tomorrow and next week.", 10, ["Montag", "heute", "morgen", "am Wochenende"]],
    ["a1-dates", "Dates and birthdays", "Say a date and understand a simple invitation.", 10, ["der erste", "im Mai", "Geburtstag", "wann"]],
  ]),
  unit("a1-people-and-home", "People and home", "Talk about the people, rooms and objects around you.", [
    ["a1-family", "Family", "Name family members and simple relationships.", 11, ["die Mutter", "der Vater", "die Familie", "das Kind"]],
    ["a1-descriptions", "People and descriptions", "Describe someone with clear, basic adjectives.", 10, ["groß", "klein", "nett", "jung"]],
    ["a1-home", "At home", "Name rooms and talk about where things are.", 12, ["die Küche", "das Zimmer", "der Tisch", "zu Hause"]],
    ["a1-possessions", "My things", "Say what belongs to you and ask simple questions about objects.", 10, ["mein", "dein", "das Handy", "der Schlüssel"]],
  ]),
  unit("a1-everyday-life", "Everyday life", "Describe a simple day, routines and what you like to do.", [
    ["a1-routines", "A typical day", "Talk about when you get up, work and rest.", 12, ["aufstehen", "arbeiten", "essen", "schlafen"]],
    ["a1-weather", "Weather and seasons", "Make easy small talk about today’s weather.", 10, ["sonnig", "kalt", "der Regen", "heute"]],
    ["a1-hobbies", "Free time", "Say what you enjoy and invite someone along.", 11, ["gern", "lesen", "Sport machen", "zusammen"]],
    ["a1-simple-plans", "Making a plan", "Suggest a time and respond to an invitation.", 12, ["Hast du Zeit?", "vielleicht", "später", "bis dann"]],
  ]),
  unit("a1-food-and-shopping", "Food and shopping", "Order confidently and make simple purchases.", [
    ["a1-food", "Food basics", "Name common food and say what you would like.", 12, ["das Brot", "das Wasser", "ich möchte", "lecker"]],
    ["a1-cafe", "At the café", "Order a drink and understand a simple question.", 11, ["einen Kaffee", "mit Milch", "sonst noch etwas", "zum Mitnehmen"]],
    ["a1-shop", "In a shop", "Ask for an item, a colour and a price.", 12, ["wie viel", "die Größe", "rot", "kaufen"]],
    ["a1-paying", "Paying and prices", "Understand totals and pay politely.", 10, ["bar", "mit Karte", "zusammen", "das kostet"]],
  ]),
  unit("a1-getting-around", "Getting around", "Find your way in town and manage a short trip.", [
    ["a1-places", "Places in town", "Recognise the places you need in a new city.", 11, ["der Bahnhof", "der Supermarkt", "die Apotheke", "das Hotel"]],
    ["a1-directions", "Finding the way", "Ask for and understand short directions.", 13, ["links", "rechts", "geradeaus", "wo ist"]],
    ["a1-transport", "Bus and train", "Buy a ticket and understand basic transport words.", 12, ["die Fahrkarte", "der Zug", "abfahren", "ankommen"]],
    ["a1-first-conversations", "First real conversations", "Bring your new language together in a short everyday chat.", 14, ["ich komme aus", "ich wohne", "und du?", "sehr schön"]],
  ]),
];

const a2Units: Unit[] = [
  unit("a2-moving-around", "Moving around", "Travel independently and solve common problems on the way.", [
    ["a2-travel", "Planning a trip", "Compare options and make a simple travel plan.", 13, ["die Reise", "buchen", "abfahren", "ankommen"]],
    ["a2-tickets", "Tickets and platforms", "Buy a ticket and find the correct platform.", 12, ["das Gleis", "umsteigen", "die Verbindung", "gültig"]],
    ["a2-hotel", "At the hotel", "Check in, ask a question and solve a small problem.", 13, ["reserviert", "das Zimmer", "der Schlüssel", "frühstücken"]],
    ["a2-travel-problems", "When plans change", "Explain a delay and ask for help calmly.", 14, ["verspätet", "verpassen", "kaputt", "helfen"]],
  ]),
  unit("a2-food-and-money", "Food and money", "Handle cafés, markets and everyday shopping naturally.", [
    ["a2-food", "Food and cafés", "Order a meal and say what you like.", 12, ["bestellen", "vegetarisch", "die Rechnung", "bezahlen"]],
    ["a2-cooking", "Cooking at home", "Follow a simple recipe and talk about ingredients.", 13, ["das Rezept", "schneiden", "kochen", "das Gemüse"]],
    ["a2-shopping", "Clothes and shopping", "Ask for sizes, colours and an alternative.", 13, ["anprobieren", "passen", "billig", "teuer"]],
    ["a2-returns", "Returns and exchanges", "Explain a problem with a purchase and ask for an exchange.", 14, ["umtauschen", "der Kassenbon", "zu klein", "zurückgeben"]],
  ]),
  unit("a2-home-and-services", "Home and services", "Take care of home, appointments and practical errands.", [
    ["a2-apartment", "Looking for a home", "Describe an apartment and ask useful questions.", 14, ["die Wohnung", "die Miete", "frei", "besichtigen"]],
    ["a2-neighbourhood", "Your neighbourhood", "Talk about where you live and what is nearby.", 12, ["die Gegend", "ruhig", "praktisch", "in der Nähe"]],
    ["a2-appointments", "Making an appointment", "Arrange a time by phone or in person.", 13, ["der Termin", "verfügbar", "verschieben", "passen"]],
    ["a2-health", "At the doctor", "Describe simple symptoms and understand basic advice.", 14, ["Schmerzen haben", "der Arzt", "das Rezept", "sich ausruhen"]],
  ]),
  unit("a2-work-and-people", "Work and people", "Connect with people at work, study and social events.", [
    ["a2-work", "Workday conversations", "Talk about tasks, schedules and colleagues.", 13, ["die Aufgabe", "die Pause", "besprechen", "beschäftigt"]],
    ["a2-study", "Learning and study", "Explain what you are learning and ask for clarification.", 12, ["üben", "verstehen", "die Prüfung", "erklären"]],
    ["a2-invitations", "Invitations and events", "Invite someone, accept or decline politely.", 13, ["einladen", "leider", "auf jeden Fall", "Lust haben"]],
    ["a2-feelings", "Feelings and reactions", "Say how you feel and respond with empathy.", 12, ["überrascht", "zufrieden", "schade", "das freut mich"]],
  ]),
  unit("a2-stories-and-plans", "Stories and plans", "Describe experiences and talk about what comes next.", [
    ["a2-weekend", "Talking about the weekend", "Tell a short story about something you did.", 14, ["zuerst", "dann", "später", "am Ende"]],
    ["a2-memories", "Past experiences", "Share a memory using clear past-time language.", 15, ["früher", "plötzlich", "erlebt", "damals"]],
    ["a2-future", "Plans for the future", "Discuss wishes, goals and next steps.", 13, ["vorhaben", "hoffentlich", "nächstes Jahr", "planen"]],
    ["a2-opinions", "Giving an opinion", "Agree, disagree and give a short reason.", 14, ["ich finde", "meiner Meinung nach", "weil", "stimmt"]],
  ]),
  unit("a2-community", "Life in the community", "Take part in practical and social conversations around you.", [
    ["a2-media", "News and media", "Talk about what you watched, read or heard.", 13, ["die Nachricht", "der Artikel", "interessant", "berichten"]],
    ["a2-culture", "Culture and recommendations", "Recommend a place, film or event.", 13, ["empfehlen", "die Ausstellung", "spannend", "besuchen"]],
    ["a2-nature", "Nature and weather", "Describe an outing and talk about the environment.", 12, ["der Wald", "spazieren gehen", "die Umwelt", "sauber"]],
    ["a2-everyday-confidence", "Everyday confidence", "Handle a full real-life conversation from start to finish.", 15, ["eigentlich", "kein Problem", "verstanden", "vielen Dank"]],
  ]),
];

const premiumUnit = (id: string, title: string, outcome: string, rows: LessonRow[]): Unit => ({ id, title, outcome, lessons: rows.map((row) => lesson(row, "premium")) });
export const courses: Course[] = [
  { code: "A1", title: "First conversations", description: "24 practical lessons for greetings, daily life, food, travel and confident first conversations.", accent: "#d6ff58", access: "free", units: a1Units },
  { code: "A2", title: "Everyday independence", description: "24 extended lessons to help you travel, work, make plans and handle real German situations.", accent: "#71e1ff", access: "free", units: a2Units },
  { code: "B1", title: "Speak with confidence", description: "Express opinions about culture, health, technology and the environment.", accent: "#ffb66d", access: "premium", units: [premiumUnit("b1-opinions", "Ideas and opinions", "Explain your point of view in connected conversations.", [
    ["b1-health", "Health", "Talk about wellbeing and make appointments.", 14, ["gesund", "die Apotheke", "sich fühlen"]],
    ["b1-culture", "Culture", "Share recommendations and discuss experiences.", 13, ["die Ausstellung", "empfehlen", "interessant"]],
    ["b1-technology", "Technology", "Speak about connected life and digital habits.", 14, ["die Nachricht", "herunterladen", "sicher"]],
  ])] },
  { code: "B2", title: "Fluent expression", description: "Handle nuanced subjects including science, economics, law and public speaking.", accent: "#dc9cff", access: "premium", units: [premiumUnit("b2-advanced", "Advanced expression", "Understand and express complex ideas with clarity.", [
    ["b2-science", "Science", "Discuss discoveries, evidence and change.", 17, ["die Forschung", "nachweisen", "die Erkenntnis"]],
    ["b2-economics", "Economics", "Follow and contribute to conversations about work and society.", 16, ["die Nachfrage", "wachsen", "die Ausgabe"]],
    ["b2-public-speaking", "Public speaking", "Structure an argument and present it with confidence.", 18, ["behaupten", "überzeugen", "zusammenfassen"]],
  ])] },
];

export const courseLevels = courses.map((course) => ({ code: course.code, title: course.title, description: course.description, lessons: course.units.reduce((count, item) => count + item.lessons.length, 0), accent: course.accent, access: course.access }));
export function getCourse(code: string | null) { return courses.find((course) => course.code === code) ?? courses[0]; }
export function getLesson(course: Course, lessonId: string | null) { return course.units.flatMap((item) => item.lessons).find((item) => item.id === lessonId); }
