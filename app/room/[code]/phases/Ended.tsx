"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicRoomState } from "@/lib/types";
import { nextRound } from "@/lib/api-client";

const MEDAL = ["🥇", "🥈", "🥉"];
const CONFETTI_COLORS = ["#6366f1", "#8b5cf6", "#fbbf24", "#34d399", "#fb7185", "#38bdf8", "#f472b6"];

function Confetti() {
  const count = 28;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {Array.from({ length: count }).map((_, i) => {
        const left = `${((i * 37) % 97) + 1}%`;
        const duration = `${2.2 + (i % 5) * 0.35}s`;
        const delay = `${(i % 7) * 0.18}s`;
        const size = 6 + (i % 4) * 3;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const isCircle = i % 3 === 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "-8px",
              left,
              width: `${size}px`,
              height: `${size + (isCircle ? 0 : 3)}px`,
              backgroundColor: color,
              borderRadius: isCircle ? "50%" : "2px",
              animationName: "confettiFall",
              animationDuration: duration,
              animationDelay: delay,
              animationTimingFunction: "ease-in",
              animationFillMode: "forwards",
            }}
          />
        );
      })}
    </div>
  );
}

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
  const amHost = room.hostId === playerId;
  const [loading, setLoading] = useState(false);

  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const iWon = winner?.id === playerId;

  async function handleNext() {
    setLoading(true);
    try {
      await nextRound(room.code, playerId);
      onRefresh();
    } catch {
      setLoading(false);
    }
  }

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1rem",
  };

  return (
    <div className="w-full max-w-md space-y-4 animate-slide-up">
      {/* Winner card */}
      <div
        className="relative p-7 text-center overflow-hidden"
        style={{
          ...cardStyle,
          background: iWon
            ? "rgba(251,191,36,0.07)"
            : "rgba(255,255,255,0.04)",
          border: iWon
            ? "1px solid rgba(251,191,36,0.3)"
            : "1px solid rgba(255,255,255,0.08)",
          boxShadow: iWon ? "0 0 40px rgba(251,191,36,0.15)" : "none",
        }}
      >
        {/* Confetti — always shown for the top finisher celebration */}
        <Confetti />

        <div
          className="relative text-6xl mb-3 animate-trophy inline-block"
          style={{ filter: "drop-shadow(0 0 20px rgba(251,191,36,0.6))" }}
        >
          🏆
        </div>
        <h2 className="relative text-3xl font-black gradient-text mb-1">
          จบรอบที่ {room.round}
        </h2>
        {winner && (
          <p className="relative text-slate-400 text-sm">
            ผู้นำ:{" "}
            <span
              className="font-bold"
              style={{
                color: iWon ? "#fbbf24" : "#e2e8f0",
              }}
            >
              {winner.name}
            </span>{" "}
            ({winner.score} คะแนน)
          </p>
        )}
        {iWon && (
          <div
            className="relative mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse-success"
            style={{
              background: "rgba(251,191,36,0.15)",
              color: "#fbbf24",
              border: "1px solid rgba(251,191,36,0.3)",
            }}
          >
            ✨ คุณชนะรอบนี้!
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div style={cardStyle} className="p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          คะแนนรวม
        </div>
        <div className="space-y-2">
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3 animate-slide-in-right"
              style={{
                background:
                  p.id === playerId
                    ? "rgba(99,102,241,0.08)"
                    : i === 0
                    ? "rgba(251,191,36,0.06)"
                    : "rgba(255,255,255,0.03)",
                border:
                  p.id === playerId
                    ? "1px solid rgba(99,102,241,0.2)"
                    : i === 0
                    ? "1px solid rgba(251,191,36,0.15)"
                    : "1px solid rgba(255,255,255,0.05)",
                animationDelay: `${i * 80}ms`,
              }}
            >
              <span className="text-lg w-7 text-center flex-shrink-0">
                {MEDAL[i] ?? <span className="text-sm font-mono text-slate-600">{i + 1}</span>}
              </span>
              <span
                className="flex-1 text-sm font-medium truncate"
                style={{ color: p.id === playerId ? "#818cf8" : "#cbd5e1" }}
              >
                {p.name}
                {p.id === playerId && (
                  <span className="ml-1.5 text-xs text-indigo-400">(คุณ)</span>
                )}
              </span>
              <span
                className="font-mono font-bold text-base animate-count-up"
                style={{
                  color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : "#cbd5e1",
                  animationDelay: `${i * 100 + 200}ms`,
                }}
              >
                {p.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Round finishers */}
      {room.finishers.length > 0 && (
        <div style={cardStyle} className="p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            ลำดับทายถูกรอบนี้
          </div>
          <div className="space-y-2">
            {room.finishers.map((fid, i) => {
              const p = room.players.find((x) => x.id === fid);
              const pts = [3, 2, 1][i] ?? 0;
              return (
                <div
                  key={fid}
                  className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{
                    background: "rgba(52,211,153,0.06)",
                    border: "1px solid rgba(52,211,153,0.15)",
                  }}
                >
                  <span className="text-sm text-slate-300">
                    {MEDAL[i] ?? `${i + 1}.`} {p?.name}
                    {fid === playerId && (
                      <span className="ml-1.5 text-xs text-indigo-400">(คุณ)</span>
                    )}
                  </span>
                  <span
                    className="font-mono font-bold text-sm"
                    style={{ color: "#34d399" }}
                  >
                    +{pts}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Answers reveal */}
      <div style={cardStyle} className="p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          เฉลยคำตอบ
        </div>
        <div className="space-y-2">
          {room.players.map((p, i) => {
            const ans = room.answers[p.id];
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 animate-fade-in"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <span className="text-sm text-slate-400">{p.name}</span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#818cf8" }}
                >
                  {ans ?? "?"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-4">
        {amHost ? (
          <button
            id="btn-next-round"
            onClick={handleNext}
            disabled={loading}
            className="flex-1 py-3.5 rounded-xl font-bold text-white transition-all duration-200 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ...
              </span>
            ) : "🔄 เริ่มรอบใหม่"}
          </button>
        ) : (
          <div
            className="flex-1 text-center py-3.5 text-sm text-slate-500 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span className="animate-blink mr-1">⏳</span>
            รอ host เริ่มรอบใหม่...
          </div>
        )}
        <button
          id="btn-exit"
          onClick={() => router.push("/")}
          className="px-5 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "#94a3b8",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "#e2e8f0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "#94a3b8";
          }}
        >
          ออก
        </button>
      </div>
    </div>
  );
}
