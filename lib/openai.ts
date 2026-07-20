/**
 * AI Provider abstraction for WHO AM I answer generation.
 *
 * Supports OpenAI (ChatGPT) and Google Gemini.
 * Provider selection via env:
 *   AI_PROVIDER = "auto" | "openai" | "gemini"  (default: "auto")
 *   OPENAI_API_KEY  = sk-...
 *   GEMINI_API_KEY  = AIza...
 *
 * In "auto" mode: tries OpenAI first, then Gemini, then fallback list.
 */

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Fallback word lists ───────────────────────────────────────────────────

const FALLBACK_TOPICS: Record<string, string[]> = {
  default: [
    "แฮร์รี่ พอตเตอร์", "สตีฟ จ็อบส์", "มาร์ติน ลูเทอร์ คิง",
    "อัลเบิร์ต ไอน์สไตน์", "เทเรซา นักบุญ", "โดราเอมอน",
    "เอลอน มัสก์", "เจนนิเฟอร์ โลเปซ", "บารัค โอบามา",
    "สมเด็จพระนเรศวร", "คลีโอพัตรา", "บิล เกตส์",
    "นักบินอวกาศ", "มังกร", "หมีแพนด้า",
  ],
  ดารา: [
    "แบรด พิตต์", "ทอม ครูซ", "ลีโอนาร์โด ดิคาปริโอ",
    "ใหม่ สะมาแสด", "เปิ้ล นภัสสร", "ปู ไปรยา",
    "เจนนิเฟอร์ โลเปซ", "เทย์เลอร์ สวิฟต์", "บียอนเซ่",
    "เคท วินสเล็ต", "เอ็มม่า วอตสัน", "โรเบิร์ต ดาวนีย์ จูเนียร์",
  ],
  การ์ตูน: [
    "มิกกี้ เมาส์", "โดราเอมอน", "โนบิตะ",
    "ซุปเปอร์แมน", "แบทแมน", "สไปเดอร์แมน",
    "พิคาชู", "มาริโอ", "ลูฟี่",
    "นารุโตะ", "ก็อกคู", "ซินจิ อิคาริ",
  ],
  ประวัติศาสตร์: [
    "อัลเบิร์ต ไอน์สไตน์", "อับราฮัม ลินคอล์น", "มหาตมะ คานธี",
    "จูเลียส ซีซาร์", "พระเจ้าตากสิน", "สมเด็จพระนเรศวร",
    "คริสตอเฟอร์ โคลัมบัส", "นโปเลียน โบนาปาร์ต",
    "วอล์ฟกัง โมซาร์ท", "ลีโอนาร์โด ดา วินชี",
    "ไมเคิล แองเจโล", "กาลิเลโอ กาลิเลอิ",
  ],
  สัตว์: [
    "สิงโต", "เสือ", "ช้าง", "ยีราฟ", "แรด",
    "ฮิปโปโปเตมัส", "เพนกวิน", "จระเข้", "งูเห่า",
    "วาฬสีน้ำเงิน", "โลมา", "ปลาหมึกยักษ์",
  ],
};

function fallback(topic: string, n: number): string[] {
  const t = topic.trim().toLowerCase();
  const list = FALLBACK_TOPICS[t] ?? FALLBACK_TOPICS.default;
  return [...list].sort(() => Math.random() - 0.5).slice(0, n);
}

// ─── Shared prompt helpers ─────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";

function buildSystemPrompt(): string {
  return (
    "คุณเป็นผู้ช่วยสร้างคำตอบสำหรับเกม 'ฉันคือใคร' (WHO AM I). " +
    "ผู้เล่นจะต้องทายว่าตัวเองคือใครโดยถาม yes/no. " +
    "ตอบกลับเฉพาะรายชื่อ บรรทัดละชื่อ ไม่มีหมายเลข ไม่มีคำอธิบาย. " +
    "ชื่อต้องไม่ซ้ำกัน และเหมาะกับการทาย."
  );
}

function buildUserPrompt(topic: string, count: number, difficulty: Difficulty): string {
  const diffDesc: Record<Difficulty, string> = {
    easy: "ที่คนทั่วไปรู้จักดีมาก แม้แต่เด็กก็รู้จัก (ง่าย)",
    medium: "ที่คนส่วนใหญ่รู้จัก ต้องคิดนิดหน่อย (ปานกลาง)",
    hard: "ที่ต้องใช้ความรู้เฉพาะทางในการทาย เช่น นักวิทยาศาสตร์ นักปรัชญา ตัวละครรอง (ยาก)",
  };
  return `หัวข้อ: "${topic}"\nระดับความยาก: ${diffDesc[difficulty]}\nขอ ${count} ชื่อ`;
}

function parseNames(text: string, count: number): string[] {
  return text
    .split("\n")
    .map((s) => s.replace(/^[\d.\-\*\s]+/, "").trim())
    .filter((s) => s.length > 0 && s.length <= 60)
    .slice(0, count);
}

// ─── OpenAI provider ───────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

async function generateWithOpenAI(
  topic: string,
  count: number,
  difficulty: Difficulty
): Promise<string[] | null> {
  const client = getOpenAIClient();
  if (!client) return null;
  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await client.chat.completions.create({
      model,
      temperature: 0.9,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(topic, count, difficulty) },
      ],
    });
    const text = res.choices[0]?.message?.content ?? "";
    const names = parseNames(text, count);
    return names.length >= Math.max(1, count - 1) ? names : null;
  } catch (err) {
    console.error("[openai] generateAnswers failed:", err);
    return null;
  }
}

// ─── Gemini provider ───────────────────────────────────────────────────────

function getGeminiClient(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

async function generateWithGemini(
  topic: string,
  count: number,
  difficulty: Difficulty
): Promise<string[] | null> {
  const client = getGeminiClient();
  if (!client) return null;
  try {
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const model = client.getGenerativeModel({ model: modelName });
    const prompt =
      buildSystemPrompt() + "\n\n" + buildUserPrompt(topic, count, difficulty);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const names = parseNames(text, count);
    return names.length >= Math.max(1, count - 1) ? names : null;
  } catch (err) {
    console.error("[gemini] generateAnswers failed:", err);
    return null;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface GenerateOptions {
  topic: string;
  count: number;
  difficulty?: Difficulty;
}

export type AISource = "openai" | "gemini" | "fallback";

/** Generate `count` distinct answers for the given topic. Always returns. */
export async function generateAnswers({
  topic,
  count,
  difficulty = "medium",
}: GenerateOptions): Promise<{ answers: string[]; source: AISource }> {
  const safeTopic = topic.trim() || "ทั่วไป";
  const provider = (process.env.AI_PROVIDER ?? "auto").toLowerCase();

  // ── Explicit provider selection ──
  if (provider === "openai") {
    const names = await generateWithOpenAI(safeTopic, count, difficulty);
    if (names) return { answers: names, source: "openai" };
    return { answers: fallback(safeTopic, count), source: "fallback" };
  }

  if (provider === "gemini") {
    const names = await generateWithGemini(safeTopic, count, difficulty);
    if (names) return { answers: names, source: "gemini" };
    return { answers: fallback(safeTopic, count), source: "fallback" };
  }

  // ── Auto mode: try OpenAI → Gemini → fallback ──
  const openaiNames = await generateWithOpenAI(safeTopic, count, difficulty);
  if (openaiNames) return { answers: openaiNames, source: "openai" };

  const geminiNames = await generateWithGemini(safeTopic, count, difficulty);
  if (geminiNames) return { answers: geminiNames, source: "gemini" };

  return { answers: fallback(safeTopic, count), source: "fallback" };
}

/** @deprecated use generateAnswers */
export { getOpenAIClient as getClient };
