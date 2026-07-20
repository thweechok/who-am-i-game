import { NextRequest } from "next/server";
import { getRoom, saveRoom } from "@/lib/redis";
import { findPlayer } from "@/lib/game";
import { generateAnswers } from "@/lib/openai";
import { getImagesForAnswers } from "@/lib/wikipedia";

export const dynamic = "force-dynamic";

interface SetupBody {
  playerId?: string;
  /** AI mode: request N answers for a topic, auto-assign */
  aiTopic?: string;
  aiAssign?: boolean;
  difficulty?: "easy" | "medium" | "hard";
  /** @deprecated manual mode fields — no longer used */
  setFor?: string;
  answer?: string;
}

/** POST /api/rooms/[code]/setup
 *  Two responsibilities:
 *  1) Set a single answer (manual mode): { setFor, answer }
 *  2) Generate + assign via AI: { aiTopic, aiAssign: true } */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/rooms/[code]">
) {
  const { code } = await ctx.params;
  let body: SetupBody = {};
  try {
    body = await request.json();
  } catch {
    /* empty */
  }
  const playerId = body.playerId;
  if (!playerId) return Response.json({ error: "ต้องระบุ playerId" }, { status: 400 });

  const room = await getRoom(code);
  if (!room) return Response.json({ error: "ไม่พบห้อง" }, { status: 404 });
  if (room.status !== "setup") {
    return Response.json({ error: "ยังไม่อยู่ในขั้นตอน setup" }, { status: 400 });
  }
  const actor = findPlayer(room, playerId);
  if (!actor) return Response.json({ error: "ไม่พบผู้เล่น" }, { status: 400 });

  // --- AI assign mode ---
  if (body.aiAssign) {
    const topic = (body.aiTopic ?? "").toString().trim() || "ทั่วไป";
    const difficulty = (["easy","medium","hard"].includes(body.difficulty ?? "") ? body.difficulty! : "medium") as "easy" | "medium" | "hard";
    room.setupMode = "ai";
    room.topic = topic;
    room.difficulty = difficulty;

    // collect active (non-spectator) players who still need an answer
    const need = room.players.filter((p) => !p.isSpectator && !room.answers[p.id]);
    if (need.length === 0) {
      return Response.json({ ok: true, assigned: 0, source: "none" });
    }
    const { answers, source } = await generateAnswers({
      topic,
      count: need.length,
      difficulty,
    });
    // shuffle so mapping isn't predictable
    const pool = [...answers].sort(() => Math.random() - 0.5);
    need.forEach((p, i) => {
      room.answers[p.id] = pool[i % pool.length] || "ไม่ทราบ";
    });
    // Fetch images from Wikipedia (fire-and-forget, non-blocking)
    // Save room first so setup completes instantly
    await saveRoom(room);
    
    // Background: fetch images and save again
    const newAnswers: Record<string, string> = {};
    need.forEach((p, i) => { newAnswers[p.id] = pool[i % pool.length] || ""; });
    getImagesForAnswers(newAnswers).then(async (images) => {
      if (Object.keys(images).length > 0) {
        try {
          const freshRoom = await getRoom(code);
          if (freshRoom) {
            freshRoom.answerImages = { ...(freshRoom.answerImages ?? {}), ...images };
            await saveRoom(freshRoom);
          }
        } catch { /* best-effort */ }
      }
    }).catch(() => { /* images are optional */ });
    
    return Response.json({ ok: true, assigned: need.length, source });
  }

  // All other modes (manual) have been removed — AI only
  return Response.json({ error: "ใช้โหมด AI สุ่มเท่านั้น" }, { status: 400 });
}
