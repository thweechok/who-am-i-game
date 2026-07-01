import OpenAI from "openai";

/**
 * Generate N distinct "answers" (people/characters/things) for the WHO AM I game
 * based on a topic. Falls back to a built-in list if the API is unavailable.
 *
 * Key is read from process.env.OPENAI_API_KEY (server-side only).
 */

const FALLBACK_TOPICS: Record<string, string[]> = {
  default: [
    "แฮร์รี่ พอตเตอร์", "สตีฟ จ็อบส์", "มาร์ติน ลูเทอร์ คิง",
    "มาสเตอร์อึด", "หมวย ลิลลี่", "โดราเอมอน",
    "เอลอน มัสก์", "เจนifar โลเปซ", "บารัค โอบามา",
    "เมาส์กับยาย", "เจ้าฟ้า", "ผึ้งน้อย",
    "หงส์ฟ้า", "เสือ", "ช้าง",
    "สุภาพสตรี", "มังกร", "หมีแพนด้า",
  ],
  ดารา: [
    "แบรด พิตต์", "ทอม ครูซ", "ลีโอนาร์โด ดิคาปริโอ",
    "หมวย ลิลลี่", "ใหม่ สะมาแสด", "เปิ้ล นภัสสร",
    "เจนifar โลเปซ", "เทย์เลอร์ สวิฟต์", "บียอนเซ่",
    "เคท วินสเล็ต", "เอ็มม่า วอตสัน", "โรเบิร์ต แดดด์ จูเนียร์",
  ],
  การ์ตูน: [
    "มิกkey เมาส์", "โดราเอมอน", "โนบิตะ",
    "ซุปเปอร์แมน", "แบทแมน", "สไปเดอร์แมน",
    "พิคาชู", "มาริโอ", "ลูฟี่",
    "นารุโตะ", "ก๊อกคู", "ซินจิ อิคาริ",
  ],
  ประวัติศาสตร์: [
    "อัลเบิร์ต ไอน์สไตน์", "นักกอน ฮก", "อับราฮัม ลินคอล์น",
    "มหาตมะ คานธี", "กูเกนโฮ", "จูเลียส ซีซาร์",
    "พระเจ้าตากสิน", "สมเด็จพระนเรศวร", "คริสตอเฟอร์ โคลัมบัส",
    "นโปเลียน โบนาปาร์ต", "วอล์ฟกัง โมซาร์ท", "ลีออนาร์โด ดา วินชี",
  ],
  สัตว์: [
    "สิงโต", "เสือ", "ช้าง",
    "ยีราฟ", "แรด", "ฮิปโปโปเตมัส",
    "เพนกวิน", "จระเข้", "งูเห่า",
    "วาฬสีน้ำเงิน", "โลมา", "ปลาหมึกยักษ์",
  ],
};

export function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function fallback(topic: string, n: number): string[] {
  const t = topic.trim().toLowerCase();
  const list = FALLBACK_TOPICS[t] ?? FALLBACK_TOPICS.default;
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export interface GenerateOptions {
  topic: string;
  count: number;
}

/** Generate `count` distinct answers for the given topic. Always returns. */
export async function generateAnswers({
  topic,
  count,
}: GenerateOptions): Promise<{ answers: string[]; source: "ai" | "fallback" }> {
  const client = getClient();
  const safeTopic = topic.trim() || "ทั่วไป";

  if (!client) {
    return { answers: fallback(safeTopic, count), source: "fallback" };
  }

  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await client.chat.completions.create({
      model,
      temperature: 0.9,
      messages: [
        {
          role: "system",
          content:
            "คุณเป็นผู้ช่วยสร้างคำตอบสำหรับเกม 'ฉันคือใคร' (WHO AM I). " +
            "ผู้เล่นจะต้องทายว่าตัวเองคือใครโดยถาม yes/no. " +
            "ตอบกลับเฉพาะรายชื่อ บรรทัดละชื่อ ไม่มีหมายเลข ไม่มีคำอธิบาย. " +
            "ชื่อต้องเป็นที่รู้จัก ไม่ซ้ำกัน และเหมาะกับการทาย.",
        },
        {
          role: "user",
          content: `หัวข้อ: "${safeTopic}"\nขอ ${count} ชื่อ ที่คนทั่วไปรู้จัก`,
        },
      ],
    });

    const text = res.choices[0]?.message?.content ?? "";
    const names = text
      .split("\n")
      .map((s) => s.replace(/^[\d.\-\*\s]+/, "").trim())
      .filter((s) => s.length > 0 && s.length <= 60)
      .slice(0, count);

    if (names.length < Math.max(2, count - 1)) {
      // too few — top up from fallback
      const extra = fallback(safeTopic, count).filter((n) => !names.includes(n));
      return { answers: [...names, ...extra].slice(0, count), source: "ai" };
    }
    return { answers: names, source: "ai" };
  } catch (err) {
    console.error("[openai] generateAnswers failed:", err);
    return { answers: fallback(safeTopic, count), source: "fallback" };
  }
}
