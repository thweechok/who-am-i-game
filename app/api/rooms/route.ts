import { NextRequest } from "next/server";
import { createRoomIfFree, generateRoomCode } from "@/lib/redis";
import { emptyRoom, newPlayer } from "@/lib/game";

export const dynamic = "force-dynamic";

/** POST /api/rooms — create a new room. Returns code + playerId. */
export async function POST(request: NextRequest) {
  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is ok
  }

  const hostName = (body.name ?? "").toString();
  if (!hostName.trim()) {
    return Response.json({ error: "ต้องใส่ชื่อ" }, { status: 400 });
  }

  const host = newPlayer(hostName);

  // try a few codes to avoid rare collisions
  let code = "";
  let created = false;
  for (let i = 0; i < 5; i++) {
    code = generateRoomCode();
    const room = emptyRoom(code, host);
    created = await createRoomIfFree(room);
    if (created) break;
  }
  if (!created) {
    return Response.json({ error: "สร้างห้องไม่สำเร็จ ลองใหม่" }, { status: 500 });
  }

  return Response.json({
    code,
    playerId: host.id,
    playerName: host.name,
  });
}
