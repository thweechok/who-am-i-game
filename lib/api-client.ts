"use client";

import type { PublicRoomState, ActionPayload } from "./types";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "request failed");
  }
  return data;
}

export async function createRoom(name: string) {
  return postJson("/api/rooms", { name }) as Promise<{
    code: string;
    playerId: string;
    playerName: string;
  }>;
}

export async function joinRoom(code: string, name: string) {
  return postJson(`/api/rooms/${code}/join`, { name }) as Promise<{
    playerId: string;
    reconnected?: boolean;
  }>;
}

export async function fetchRoom(
  code: string,
  playerId: string,
  version: number
): Promise<PublicRoomState | null> {
  const url = `/api/rooms/${code}?playerId=${encodeURIComponent(
    playerId
  )}&v=${version}`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 304) return null; // unchanged
  if (res.status === 404) throw new Error("ROOM_NOT_FOUND");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "fetch failed");
  }
  return res.json();
}

export async function startGame(
  code: string,
  playerId: string,
  phase: "setup" | "playing"
) {
  return postJson(`/api/rooms/${code}/start`, { playerId, phase });
}

export async function setupManual(
  code: string,
  playerId: string,
  setFor: string,
  answer: string
) {
  return postJson(`/api/rooms/${code}/setup`, {
    playerId,
    setFor,
    answer,
  });
}

export async function setupAI(
  code: string,
  playerId: string,
  topic: string
) {
  return postJson(`/api/rooms/${code}/setup`, {
    playerId,
    aiAssign: true,
    aiTopic: topic,
  }) as Promise<{ ok: boolean; assigned: number; source: string }>;
}

export async function sendAction(
  code: string,
  playerId: string,
  payload: ActionPayload
) {
  return postJson(`/api/rooms/${code}/action`, { playerId, ...payload });
}

export async function nextRound(code: string, playerId: string) {
  return postJson(`/api/rooms/${code}/next-round`, { playerId });
}
