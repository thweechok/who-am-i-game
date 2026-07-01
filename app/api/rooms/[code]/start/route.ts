import { NextRequest } from "next/server";
import { getRoom, saveRoom } from "@/lib/redis";
import { beginSetup, beginPlaying } from "@/lib/game";

export const dynamic = "force-dynamic";

/** POST /api/rooms/[code]/start { playerId, phase: "setup"|"playing" }
 *  - phase="setup": host moves lobby -> setup
 *  - phase="playing": host moves setup -> playing (requires all answers set) */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/rooms/[code]">
) {
  const { code } = await ctx.params;
  let body: { playerId?: string; phase?: "setup" | "playing" } = {};
  try {
    body = await request.json();
  } catch {
    /* empty */
  }

  const playerId = body.playerId;
  const phase = body.phase ?? "setup";
  if (!playerId) return Response.json({ error: "ต้องระบุ playerId" }, { status: 400 });

  const room = await getRoom(code);
  if (!room) return Response.json({ error: "ไม่พบห้อง" }, { status: 404 });
  if (room.hostId !== playerId) {
    return Response.json({ error: "เฉพาะ host เท่านั้น" }, { status: 403 });
  }

  const result =
    phase === "playing" ? beginPlaying(room) : beginSetup(room);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  await saveRoom(room);
  return Response.json({ ok: true, status: room.status });
}
