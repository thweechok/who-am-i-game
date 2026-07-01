"use client";

import { useState } from "react";
import type { PublicRoomState } from "@/lib/types";
import { startGame } from "@/lib/api-client";

export function Lobby({
  room,
  playerId,
  onRefresh,
}: {
  room: PublicRoomState;
  playerId: string;
  onRefresh: () => void;
}) {
  const isHost = room.hostId === playerId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleStart() {
    setLoading(true);
    setError("");
    try {
      await startGame(room.code, playerId, "setup");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }

  function copyInvite() {
    const url = `${window.location.origin}/room/${room.code}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          ล็อบบี้
        </h2>

        {/* room code */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 rounded-lg bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
            <div className="text-xs text-zinc-500">รหัสห้อง</div>
            <div className="font-mono text-2xl tracking-[0.4em] text-zinc-900 dark:text-zinc-50">
              {room.code}
            </div>
          </div>
          <button
            onClick={copyInvite}
            className="rounded-lg border border-zinc-300 px-3 py-3 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {copied ? "✓ คัดลอกแล้ว" : "คัดลอกลิงก์"}
          </button>
        </div>

        {/* players */}
        <div className="mt-6">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            ผู้เล่น ({room.players.length}/6)
          </div>
          <ul className="space-y-1.5">
            {room.players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60"
              >
                <span className="text-sm text-zinc-800 dark:text-zinc-200">
                  {p.name}
                  {p.id === playerId && (
                    <span className="ml-1.5 text-xs text-indigo-500">(คุณ)</span>
                  )}
                </span>
                {p.id === room.hostId && (
                  <span className="text-xs text-zinc-400">host</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {isHost ? (
          <button
            onClick={handleStart}
            disabled={loading || room.players.length < 3}
            className="mt-6 w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {room.players.length < 3
              ? `ต้องมีอย่างน้อย 3 คน (ขาวอีก ${3 - room.players.length})`
              : loading
              ? "กำลังเริ่ม..."
              : "เริ่มเกม"}
          </button>
        ) : (
          <p className="mt-6 text-center text-sm text-zinc-400">
            รอ host เริ่มเกม...
          </p>
        )}
      </div>
    </div>
  );
}
