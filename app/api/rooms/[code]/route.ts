import { NextRequest } from "next/server";
import { getRoom } from "@/lib/redis";
import { toPublic } from "@/lib/game";

export const dynamic = "force-dynamic";

/** GET /api/rooms/[code]?playerId=...&v=<version>
 *  Returns public room state with own answer hidden.
 *  Supports conditional polling: if client's v matches, return 304. */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/rooms/[code]">
) {
  const { code } = await ctx.params;
  const playerId = request.nextUrl.searchParams.get("playerId");
  const clientVersion = Number(request.nextUrl.searchParams.get("v") ?? "0");

  const room = await getRoom(code);
  if (!room) {
    return Response.json({ error: "ไม่พบห้อง" }, { status: 404 });
  }
  if (!playerId) {
    return Response.json({ error: "ต้องระบุ playerId" }, { status: 400 });
  }

  // conditional polling: nothing changed since client last saw it
  if (room.version === clientVersion) {
    return new Response(null, { status: 304 });
  }

  const pub = toPublic(room, playerId);
  return Response.json(pub);
}
