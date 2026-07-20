/**
 * AI-powered question answerer for WHO AM I gameplay.
 * Given a character name and a yes/no question, returns the correct answer.
 */

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type YesNoAnswer = "yes" | "no" | "maybe";

interface AIAnswerResult {
  answer: YesNoAnswer;
  /** Very short Thai reasoning shown to the player */
  reason: string;
  source: "openai" | "gemini" | "fallback";
}

function buildAnswerPrompt(character: string, question: string): string {
  return (
    `ในเกม WHO AM I ตัวละคร/บุคคลที่ถูกซ่อนคือ: "${character}"\n` +
    `ผู้เล่นถามว่า: "${question}"\n\n` +
    `ตอบในรูปแบบ JSON เท่านั้น:\n` +
    `{"answer":"yes|no|maybe","reason":"อธิบายสั้นๆ ภาษาไทย ไม่เกิน 15 คำ"}\n\n` +
    `กฎ:\n` +
    `- answer ต้องเป็น yes, no หรือ maybe เท่านั้น\n` +
    `- ถ้าไม่แน่ใจให้ตอบ maybe\n` +
    `- reason สั้นๆ เช่น "เมซซี่เกิดปี 1987 อายุเกิน 30 แล้ว"`
  );
}

function parseAnswer(text: string): AIAnswerResult | null {
  try {
    // extract JSON from response
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const ans = parsed.answer?.toLowerCase();
    if (!["yes", "no", "maybe"].includes(ans)) return null;
    return {
      answer: ans as YesNoAnswer,
      reason: (parsed.reason ?? "").slice(0, 80),
      source: "openai", // will be overridden
    };
  } catch {
    return null;
  }
}

async function answerWithOpenAI(
  character: string,
  question: string
): Promise<AIAnswerResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const client = new OpenAI({ apiKey: key });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "คุณเป็น Game Master ของเกม WHO AM I ที่รู้ข้อมูลทุกอย่างเกี่ยวกับบุคคลและตัวละครต่างๆ " +
            "ตอบคำถาม yes/no เกี่ยวกับตัวละครที่กำหนด ด้วย JSON เท่านั้น",
        },
        { role: "user", content: buildAnswerPrompt(character, question) },
      ],
    });
    const text = res.choices[0]?.message?.content ?? "";
    const result = parseAnswer(text);
    if (result) result.source = "openai";
    return result;
  } catch (err) {
    console.error("[ai-answer] OpenAI failed:", err);
    return null;
  }
}

async function answerWithGemini(
  character: string,
  question: string
): Promise<AIAnswerResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const client = new GoogleGenerativeAI(key);
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" },
    });
    const prompt = buildAnswerPrompt(character, question);
    const res = await model.generateContent(prompt);
    const text = res.response.text();
    const result = parseAnswer(text);
    if (result) result.source = "gemini";
    return result;
  } catch (err) {
    console.error("[ai-answer] Gemini failed:", err);
    return null;
  }
}

/** Get AI answer for a yes/no question about a character. */
export async function getAIAnswer(
  character: string,
  question: string
): Promise<AIAnswerResult> {
  const provider = (process.env.AI_PROVIDER ?? "auto").toLowerCase();

  if (provider === "openai") {
    const r = await answerWithOpenAI(character, question);
    return r ?? { answer: "maybe", reason: "ไม่สามารถตรวจสอบข้อมูลได้", source: "fallback" };
  }
  if (provider === "gemini") {
    const r = await answerWithGemini(character, question);
    return r ?? { answer: "maybe", reason: "ไม่สามารถตรวจสอบข้อมูลได้", source: "fallback" };
  }

  // auto: try OpenAI → Gemini → fallback
  const openaiResult = await answerWithOpenAI(character, question);
  if (openaiResult) return openaiResult;

  const geminiResult = await answerWithGemini(character, question);
  if (geminiResult) return geminiResult;

  return { answer: "maybe", reason: "ไม่มี AI key — ไม่สามารถตรวจสอบได้", source: "fallback" };
}
