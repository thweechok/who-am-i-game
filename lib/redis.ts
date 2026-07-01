import { Redis } from "@upstash/redis";
import type { RoomState } from "./types";

/**
 * Upstash Redis client (REST). Works statelessly on Vercel serverless.
 * Configure via env in Vercel project settings:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

function getClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing Upstash env. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
    );
  }
  return new Redis({ url, token });
}

export const ROOM_TTL_SECONDS = 2 * 60 * 60; // 2 hours, renewed on each save

export function roomKey(code: string) {
  return `room:${code.toUpperCase()}`;
}

/** Generate a short, human-friendly room code */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusable chars
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function getRoom(code: string): Promise<RoomState | null> {
  const redis = getClient();
  const raw = await redis.get<string>(roomKey(code));
  if (!raw) return null;
  try {
    return typeof raw === "string" ? (JSON.parse(raw) as RoomState) : (raw as RoomState);
  } catch {
    return null;
  }
}

/** Save room + renew TTL. Bumps version only if bumpVersion=true (default). */
export async function saveRoom(
  room: RoomState,
  opts?: { bumpVersion?: boolean }
): Promise<RoomState> {
  const redis = getClient();
  const bump = opts?.bumpVersion ?? true;
  const next: RoomState = bump
    ? { ...room, version: room.version + 1 }
    : room;
  await redis.set(roomKey(room.code), JSON.stringify(next), {
    ex: ROOM_TTL_SECONDS,
  });
  return next;
}

export async function deleteRoom(code: string) {
  const redis = getClient();
  await redis.del(roomKey(code));
}

/** Atomic-ish create: only succeed if the code is free. Returns true if created. */
export async function createRoomIfFree(room: RoomState): Promise<boolean> {
  const redis = getClient();
  // SET NX with TTL — only sets if key doesn't exist
  const res = await redis.set(roomKey(room.code), JSON.stringify(room), {
    ex: ROOM_TTL_SECONDS,
    nx: true,
  });
  return res === "OK";
}
