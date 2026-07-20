"use client";

import { useState } from "react";
import type { PublicRoomState } from "@/lib/types";
import { startGame } from "@/lib/api-client";

function PlayerAvatar({ name, isYou, isHost }: { name: string; isYou: boolean; isHost: boolean }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{
          background: isYou
            ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
            : "rgba(255,255,255,0.07)",
          boxShadow: isYou ? "0 0 12px rgba(99,102,241,0.4)" : "none",
        }}
      >
        {initial}
        {/* Online pulse */}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
          style={{ background: "#34d399", boxShadow: "0 0 6px #34d399" }}
        />
      </div>
      <div>
        <span className="text-sm font-medium text-slate-200">
          {name}
          {isYou && <span className="ml-1.5 text-xs text-indigo-400">(คุณ)</span>}
        </span>
        {isHost && (
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
            host
          </span>
        )}
      </div>
    </div>
  );
}

export function Lobby({
  room,
  playerId,
  onRefresh,
}: {
  room: PublicRoomState;
  playerId: string;
  onRefresh: () => void;
}) {
  const amHost = room.hostId === playerId;
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
    setTimeout(() => setCopied(false), 1800);
  }

  const canStart = room.players.length >= 3;

  return (
    <div className="w-full max-w-md animate-slide-up">
      <div
        className="rounded-2xl p-6"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <h2 className="text-lg font-bold text-slate-100 mb-5">ล็อบบี้</h2>

        {/* Room code */}
        <div
          className="rounded-xl p-4 mb-5 flex items-center gap-3"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}
        >
          <div className="flex-1">
            <div className="text-xs text-indigo-400/70 font-semibold uppercase tracking-widest mb-1">
              รหัสห้อง
            </div>
            <div
              className="font-mono text-3xl font-black tracking-[0.5em] text-indigo-300"
              style={{ textShadow: "0 0 20px rgba(129,140,248,0.5)" }}
            >
              {room.code}
            </div>
          </div>
          <button
            id="btn-copy-invite"
            onClick={copyInvite}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
            style={
              copied
                ? { background: "rgba(52,211,153,0.2)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }
                : { background: "rgba(255,255,255,0.07)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }
            }
          >
            {copied ? "✓ คัดลอก!" : "คัดลอกลิงก์"}
          </button>
        </div>

        {/* Players */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ผู้เล่น
            </span>
            <span
              className="text-xs font-mono px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}
            >
              {room.players.length}/6
            </span>
          </div>
          <ul className="space-y-2">
            {room.players.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 animate-slide-in-right"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <PlayerAvatar
                  name={p.name}
                  isYou={p.id === playerId}
                  isHost={p.id === room.hostId}
                />
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-2.5 mb-4 text-sm"
            style={{ background: "rgba(251,113,133,0.1)", color: "#fb7185" }}
          >
            {error}
          </div>
        )}

        {amHost ? (
          <button
            id="btn-start-game"
            onClick={handleStart}
            disabled={loading || !canStart}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={
              canStart
                ? {
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
                  }
                : { background: "rgba(255,255,255,0.06)" }
            }
            onMouseEnter={(e) => {
              if (canStart && !loading) e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                กำลังเริ่ม...
              </span>
            ) : !canStart ? (
              `ต้องมีอย่างน้อย 3 คน (ขาดอีก ${3 - room.players.length} คน)`
            ) : (
              "🎮 เริ่มเกม"
            )}
          </button>
        ) : (
          <div
            className="text-center py-3.5 rounded-xl text-sm text-slate-500"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span className="animate-blink mr-1">⏳</span>
            รอ host เริ่มเกม...
          </div>
        )}
      </div>
    </div>
  );
}
