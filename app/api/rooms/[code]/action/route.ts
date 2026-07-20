import { NextRequest } from "next/server";
import { getRoom, saveRoom } from "@/lib/redis";
import { applyAction } from "@/lib/game";
import type { ActionPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

/** POST /api/rooms/[code]/action { playerId, type, text, value } */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/rooms/[code]">
) {
  const { code } = await ctx.params;
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "body ไม่ถูกต้อง" }, { status: 400 });
  }

  const playerId = body.playerId as string | undefined;
  if (!playerId) return Response.json({ error: "ต้องระบุ playerId" }, { status: 400 });

  const room = await getRoom(code);
  if (!room) return Response.json({ error: "ไม่พบห้อง" }, { status: 404 });

  // Build a typed payload from raw body
  const rawType = body.type as string | undefined;
  const rawText = (body.text as string | undefined) ?? "";

  let payload: ActionPayload;
  if (rawType === "ask") {
    payload = { type: "ask", text: rawText };
  } else if (rawType === "guess") {
    payload = { type: "guess", text: rawText };
  } else if (rawType === "answer" && (rawText === "yes" || rawText === "no" || rawText === "maybe")) {
    payload = { type: "answer", text: rawText };
  } else if (rawType === "pass") {
    payload = { type: "pass" };
  } else if (rawType === "timeUp") {
    payload = { type: "timeUp" };
  } else if (rawType === "setMaxQuestions") {
    payload = { type: "setMaxQuestions", value: Number(body.value) || 5 };
  } else {
    return Response.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
  }

  const result = applyAction(room, playerId, payload);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  await saveRoom(room);
  return Response.json({ ok: true });
}
