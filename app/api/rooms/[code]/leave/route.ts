import { NextRequest } from 'next/server';
import { getRoom, saveRoom } from '@/lib/redis';
import { migrateHost } from '@/lib/game';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  let body: { playerId?: string } = {};
  try { body = await request.json(); } catch {}
  const { playerId } = body;
  if (!playerId) return Response.json({ error: 'ต้องระบุ playerId' }, { status: 400 });
  const room = await getRoom(code);
  if (!room) return Response.json({ ok: true }); // room already gone
  
  // Migrate host if needed
  migrateHost(room, playerId);
  
  if (room.status === 'lobby') {
    // Remove from lobby
    room.players = room.players.filter(p => p.id !== playerId);
  } else {
    // During game: remove from turnOrder so they get skipped
    room.turnOrder = room.turnOrder.filter(id => id !== playerId);
  }
  
  await saveRoom(room);
  return Response.json({ ok: true });
}
