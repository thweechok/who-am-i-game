import { NextRequest } from "next/server";
import { getRoom, saveRoom } from "@/lib/redis";
import { addPlayer, newPlayer } from "@/lib/game";

export const dynamic = "force-dynamic";

/** POST /api/rooms/[code]/join { name, isSpectator? } -> { playerId } */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/rooms/[code]">
) {
  const { code } = await ctx.params;
  let body: { name?: string; isSpectator?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    /* empty */
  }

  const name = (body.name ?? "").toString().trim();
  if (!name) return Response.json({ error: "ต้องใส่ชื่อ" }, { status: 400 });

  const room = await getRoom(code);
  if (!room) return Response.json({ error: "ไม่พบห้อง" }, { status: 404 });

  // Check for duplicate name
  const existing = room.players.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );

  if (existing) {
    // Allow reconnect only when game is already in progress (not lobby)
    if (room.status !== "lobby") {
      return Response.json({ playerId: existing.id, reconnected: true });
    }
    // In lobby: reject duplicate name
    return Response.json(
      { error: `ชื่อ "${name}" มีคนใช้แล้ว — ลองใช้ชื่ออื่น` },
      { status: 400 }
    );
  }

  const isSpectator = body.isSpectator === true;
  const player = newPlayer(name, isSpectator);
  const result = addPlayer(room, player);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  await saveRoom(room);
  return Response.json({ playerId: player.id });
}
