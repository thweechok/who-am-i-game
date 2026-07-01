import { NextRequest } from "next/server";
import { getRoom } from "@/lib/redis";
import { toPublic } from "@/lib/game";

export const dynamic = "force-dynamic";

/**
 * GET /api/rooms/[code]?playerId=...&v=<version>
 *
 * Conditional polling: returns 304 when state hasn't changed since the
 * client's version. One Upstash GET per request — no server-side busy wait,
 * which is the cheapest model for serverless.
 *
 * Client controls frequency via lib/useRoom.ts (adaptive polling).
 */
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
