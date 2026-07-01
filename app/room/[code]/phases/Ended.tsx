"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicRoomState } from "@/lib/types";
import { nextRound } from "@/lib/api-client";

export function Ended({
  room,
  playerId,
  onRefresh,
}: {
  room: PublicRoomState;
  playerId: string;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const isHost = room.hostId === playerId;
  const [loading, setLoading] = useState(false);

  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];

  async function handleNext() {
    setLoading(true);
    try {
      await nextRound(room.code, playerId);
      onRefresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-5xl">🏆</div>
        <h2 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          จบรอบที่ {room.round}
        </h2>
        {winner && (
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            ผู้นำ: <span className="font-semibold">{winner.name}</span> ({winner.score} คะแนน)
          </p>
        )}
      </div>

      {/* scoreboard */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          คะแนนรวม
        </div>
        <div className="space-y-2">
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60"
            >
              <span className="w-6 text-center font-mono text-sm text-zinc-400">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">
                {p.name}
                {p.id === playerId && (
                  <span className="ml-1.5 text-xs text-indigo-500">(คุณ)</span>
                )}
              </span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {p.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* finishers this round */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          ลำดับการทายถูกรอบนี้
        </div>
        {room.finishers.length === 0 ? (
          <p className="text-sm text-zinc-400">ไม่มีใครทายถูก</p>
        ) : (
          <div className="space-y-1.5">
            {room.finishers.map((fid, i) => {
              const p = room.players.find((x) => x.id === fid);
              const pts = [3, 2, 1][i] ?? 0;
              return (
                <div key={fid} className="flex justify-between text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {i + 1}. {p?.name}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{pts}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {isHost ? (
          <button
            onClick={handleNext}
            disabled={loading}
            className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "..." : "เริ่มรอบใหม่"}
          </button>
        ) : (
          <p className="flex-1 text-center text-sm text-zinc-400 py-2.5">
            รอ host เริ่มรอบใหม่...
          </p>
        )}
        <button
          onClick={() => router.push("/")}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ออก
        </button>
      </div>
    </div>
  );
}
