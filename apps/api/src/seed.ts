import "dotenv/config";
import mongoose from "mongoose";
import { Course } from "./models/Course.js";
import { Lesson } from "./models/Lesson.js";

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) throw new Error("MONGO_URI is required to seed demo content");
if (process.env.NODE_ENV === "production") throw new Error("The demo seed is intentionally disabled in production");

async function seed() {
  await mongoose.connect(mongoUri!);

  const a1 = await Course.findOneAndUpdate(
    { slug: "a1-foundations" },
    {
      $set: {
        cefrLevel: "A1",
        title: "A1 · Foundations",
        description: "Build practical confidence with greetings, introductions and the language of daily life.",
        access: "free",
        published: true,
        position: 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const b1 = await Course.findOneAndUpdate(
    { slug: "b1-confident-conversation" },
    {
      $set: {
        cefrLevel: "B1",
        title: "B1 · Confident conversation",
        description: "Express opinions and navigate richer conversations about the topics that matter to you.",
        access: "premium",
        published: true,
        position: 3,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await Promise.all([
    Lesson.findOneAndUpdate(
      { slug: "a1-greetings" },
      {
        $set: {
          course: a1._id,
          title: "Hello and goodbye",
          summary: "Meet the German greetings you will use from your very first conversation.",
          position: 1,
          access: "free",
          published: true,
          durationMinutes: 8,
          blocks: [
            { type: "heading", title: "Start with a friendly hello" },
            { type: "paragraph", text: "German greetings change naturally across the day. Learn the phrase, listen to its rhythm, then use it in a small real-life exchange." },
            { type: "vocabulary", items: [{ german: "Hallo", translation: "Hello" }, { german: "Guten Morgen", translation: "Good morning" }, { german: "Tschüss", translation: "Bye" }] },
          ],
          exercises: [{ id: "greeting-meaning", kind: "multiple_choice", prompt: "What does “Guten Morgen” mean?", options: ["Good morning", "Good evening", "Goodbye", "Thank you"], answer: "Good morning", explanation: "Guten Morgen is the standard greeting before midday.", points: 10 }],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
    Lesson.findOneAndUpdate(
      { slug: "a1-family" },
      {
        $set: {
          course: a1._id,
          title: "Family",
          summary: "Talk about family members with useful everyday nouns and articles.",
          position: 2,
          access: "free",
          published: true,
          durationMinutes: 10,
          blocks: [
            { type: "heading", title: "People around you" },
            { type: "vocabulary", items: [{ german: "die Mutter", translation: "mother" }, { german: "der Vater", translation: "father" }, { german: "die Familie", translation: "family" }] },
          ],
          exercises: [{ id: "family-meaning", kind: "multiple_choice", prompt: "What does “die Mutter” mean?", options: ["Sister", "Mother", "Daughter", "Grandmother"], answer: "Mother", explanation: "Mutter means mother. Learn the article die with the word.", points: 10 }],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
    Lesson.findOneAndUpdate(
      { slug: "b1-health" },
      {
        $set: {
          course: b1._id,
          title: "Health and wellbeing",
          summary: "Build the vocabulary you need to describe how you feel and get help when you need it.",
          position: 1,
          access: "premium",
          published: true,
          durationMinutes: 14,
          blocks: [
            { type: "heading", title: "Talking about how you feel" },
            { type: "paragraph", text: "At B1, you will use connected phrases to explain symptoms, make appointments and give simple advice." },
            { type: "vocabulary", items: [{ german: "sich fühlen", translation: "to feel" }, { german: "die Apotheke", translation: "pharmacy" }, { german: "gesund", translation: "healthy" }] },
          ],
          exercises: [{ id: "health-meaning", kind: "multiple_choice", prompt: "What does “die Apotheke” mean?", options: ["Hospital", "Pharmacy", "Doctor", "Insurance"], answer: "Pharmacy", explanation: "Die Apotheke is where you collect medication and ask for basic health advice.", points: 10 }],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
  ]);

  console.log("Seeded Deutschio demo courses and lessons");
}

seed()
  .catch((error: unknown) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect(); });
