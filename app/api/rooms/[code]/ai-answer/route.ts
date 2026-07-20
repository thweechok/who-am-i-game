import { NextRequest } from "next/server";
import { getRoom } from "@/lib/redis";
import { findPlayer } from "@/lib/game";
import { getAIAnswer } from "@/lib/ai-answer";

export const dynamic = "force-dynamic";

/**
 * POST /api/rooms/[code]/ai-answer
 * Body: { playerId, question, characterId }
 * → { answer: "yes"|"no"|"maybe", reason: string }
 *
 * characterId = the asker's playerId (whose character we're answering about)
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/rooms/[code]">
) {
  const { code } = await ctx.params;
  let body: { playerId?: string; question?: string; characterId?: string } = {};
  try { body = await request.json(); } catch { /* empty */ }

  const { playerId, question, characterId } = body;
  if (!playerId || !question || !characterId) {
    return Response.json({ error: "ต้องระบุ playerId, question, characterId" }, { status: 400 });
  }

  const room = await getRoom(code);
  if (!room) return Response.json({ error: "ไม่พบห้อง" }, { status: 404 });
  if (room.status !== "playing") {
    return Response.json({ error: "เกมยังไม่ได้เริ่ม" }, { status: 400 });
  }

  const player = findPlayer(room, playerId);
  if (!player) return Response.json({ error: "ไม่พบผู้เล่น" }, { status: 400 });

  // Get the character name (the asker's answer which this player can see)
  const characterName = room.answers[characterId];
  if (!characterName) {
    return Response.json({ error: "ไม่พบข้อมูลตัวละคร" }, { status: 400 });
  }

  // Prevent the asker from using AI to answer their own question
  if (playerId === characterId) {
    return Response.json({ error: "คุณไม่สามารถถาม AI เกี่ยวกับตัวเองได้" }, { status: 403 });
  }

  const result = await getAIAnswer(characterName, question);
  return Response.json({ ok: true, ...result, characterName });
}
