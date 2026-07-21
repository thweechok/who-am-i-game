"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicRoomState } from "@/lib/types";
import { nextRound } from "@/lib/api-client";

const MEDAL = ["🥇", "🥈", "🥉"];
const CONFETTI_COLORS = ["#FF8C42", "#4DACF7", "#51CF66", "#FFD43B", "#FF6B6B", "#9B59B6", "#1ABC9C"];

function Confetti() {
  const count = 28;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[16px]">
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

  const ranked = [...room.players].filter(p => !p.isSpectator).sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  // Round winner = first to guess correctly this round
  const roundWinnerId = room.finishers[0] ?? null;
  const iWonRound = roundWinnerId === playerId;
  const iWon = winner?.id === playerId;
  const isGameOver = room.round >= (room.totalRounds ?? 1);

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
    background: "rgba(37,21,69,0.6)",
    border: "2px solid rgba(151,117,250,0.2)",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 animate-slide-up">
      {/* Winner card */}
      <div
        className="relative p-7 text-center overflow-hidden"
        style={{
          ...cardStyle,
          background: iWon ? "rgba(255,212,59,0.12)" : "rgba(37,21,69,0.6)",
          border: iWon ? "2px solid #FFD43B" : "2px solid rgba(151,117,250,0.2)",
          boxShadow: iWon ? "0 8px 24px rgba(255,212,59,0.2)" : cardStyle.boxShadow,
        }}
      >
        {/* Confetti — always shown for the top finisher celebration */}
        <Confetti />

        <div
          className="relative text-6xl mb-3 animate-trophy inline-block"
          style={{ filter: "drop-shadow(0 4px 8px rgba(255,212,59,0.6))" }}
        >
          🏆
        </div>
        <h2 className="relative text-3xl font-black mb-1" style={{ color: "#e2e8f0" }}>
          {isGameOver ? "🏆 จบเกม!" : `จบรอบที่ ${room.round}/${room.totalRounds ?? 1}`}
        </h2>
        {winner && (
          <p className="relative text-base font-bold" style={{ color: "#a89cc8" }}>
            ผู้นำ:{" "}
            <span
              className="font-black text-lg"
              style={{
                color: iWon ? "#FFD43B" : "#FF8C42",
              }}
            >
              {winner.name}
            </span>{" "}
            ({winner.score} คะแนน)
          </p>
        )}
        {iWonRound && (
          <div
            className="relative mt-3 inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-black animate-pulse-success"
            style={{
              background: "rgba(81,207,102,0.12)",
              color: "#51CF66",
              border: "2px solid #51CF66",
            }}
          >
            ✨ คุณทายถูกก่อนใครรอบนี้!
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div style={cardStyle} className="p-5">
        <div className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#a89cc8" }}>
          คะแนนรวม
        </div>
        <div className="space-y-3">
          {ranked.map((p, i) => {
            const rankColor = i === 0 ? "#FFD43B" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "rgba(151,117,250,0.15)";
            return (
              <div
                key={p.id}
                className="flex items-center gap-4 rounded-[16px] px-4 py-3 animate-slide-in-right"
                style={{
                  background: p.id === playerId ? "rgba(255,140,66,0.1)" : "rgba(37,21,69,0.4)",
                  border: p.id === playerId ? "2px solid #FF8C42" : "2px solid rgba(151,117,250,0.2)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <span 
                  className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0"
                  style={{ 
                    backgroundColor: rankColor, 
                    color: i < 3 ? "rgba(37,21,69,0.6)" : "#a89cc8",
                    textShadow: i < 3 ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                >
                  {i < 3 ? MEDAL[i] : i + 1}
                </span>
                <span
                  className="flex-1 text-lg font-black truncate"
                  style={{ color: "#e2e8f0" }}
                >
                  {p.name}
                  {p.id === playerId && (
                    <span className="ml-2 text-sm font-bold" style={{ color: "#FF8C42" }}>(คุณ)</span>
                  )}
                </span>
                <span
                  className="font-black text-2xl animate-count-up px-4 py-1 rounded-xl"
                  style={{
                    backgroundColor: rankColor,
                    color: i < 3 ? "rgba(37,21,69,0.6)" : "#a89cc8",
                    textShadow: i < 3 ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    animationDelay: `${i * 100 + 200}ms`,
                  }}
                >
                  {p.score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Round finishers */}
      {room.finishers.length > 0 && (
        <div style={cardStyle} className="p-5">
          <div className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "#a89cc8" }}>
            ลำดับทายถูกรอบนี้
          </div>
          <div className="space-y-3">
            {room.finishers.map((fid, i) => {
              const p = room.players.find((x) => x.id === fid);
              const pts = [3, 2, 1][i] ?? 0;
              return (
                <div
                  key={fid}
                  className="flex items-center justify-between rounded-[16px] px-4 py-3"
                  style={{
                    background: "rgba(81,207,102,0.12)",
                    border: "2px solid #51CF66",
                  }}
                >
                  <span className="text-lg font-black" style={{ color: "#e2e8f0" }}>
                    {MEDAL[i] ?? `${i + 1}.`} {p?.name}
                    {fid === playerId && (
                      <span className="ml-2 text-sm font-bold" style={{ color: "#51CF66" }}>(คุณ)</span>
                    )}
                  </span>
                  <span
                    className="font-black text-xl px-3 py-1 rounded-lg"
                    style={{ backgroundColor: "#51CF66", color: "rgba(37,21,69,0.6)", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
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
        <div className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "#a89cc8" }}>
          เฉลยคำตอบ
        </div>
        <div className="space-y-3">
          {room.players.filter(p => !p.isSpectator).map((p, i) => {
            const ans = p.id === playerId
              ? (room.myAnswer ?? room.allAnswers?.[p.id])
              : room.allAnswers?.[p.id] ?? room.answers?.[p.id];
            const imgUrl = room.answerImages?.[p.id];
            return (
              <div
                key={p.id}
                className="flex items-center gap-4 rounded-[16px] px-4 py-3 animate-fade-in"
                style={{
                  background: "rgba(37,21,69,0.4)",
                  border: "2px solid rgba(151,117,250,0.2)",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                {imgUrl && (
                  <img src={imgUrl} alt={ans ?? ""} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-sm"
                    style={{ border: "2px solid rgba(151,117,250,0.2)" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                )}
                <span className="text-lg font-bold flex-1" style={{ color: "#a89cc8" }}>{p.name}</span>
                <span
                  className="text-xl font-black"
                  style={{ color: "#4DACF7" }}
                >
                  {ans ?? "?"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 pb-6 pt-2">
        {amHost ? (
          <button
            id="btn-next-round"
            onClick={handleNext}
            disabled={loading}
            className="flex-1 py-4 font-black text-white text-xl transition-all duration-200 disabled:opacity-50"
            style={{
              background: "#FF8C42",
              boxShadow: "0 6px 0 #D66D24, 0 8px 16px rgba(255,140,66,0.3)",
              border: "3px solid #FFFFFF",
              borderRadius: "999px",
              transform: "translateY(0)",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(6px)";
              e.currentTarget.style.boxShadow = "0 0 0 #D66D24, 0 4px 8px rgba(255,140,66,0.3)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 0 #D66D24, 0 8px 16px rgba(255,140,66,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 0 #D66D24, 0 8px 16px rgba(255,140,66,0.3)";
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-6 h-6 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                ...
              </span>
            ) : isGameOver ? "🏆 จบเกม — ดูคะแนนสรุป" : `🔄 รอบถัดไป (${room.round + 1}/${room.totalRounds ?? 1})`}
          </button>
        ) : (
          <div
            className="flex-1 text-center py-4 text-lg font-black text-white rounded-[999px] flex items-center justify-center"
            style={{ 
              background: "#FF8C42", 
              boxShadow: "0 6px 0 #D66D24, 0 8px 16px rgba(255,140,66,0.3)",
              border: "3px solid #FFFFFF",
              opacity: 0.8
            }}
          >
            <span className="animate-blink mr-2">⏳</span>
            {isGameOver ? "🏆 จบเกมแล้ว!" : "รอ host เริ่มรอบถัดไป..."}
          </div>
        )}
        <button
          id="btn-exit"
          onClick={() => router.push("/")}
          className="px-8 py-4 font-black text-white text-xl transition-all duration-150"
          style={{
            background: "#4DACF7",
            boxShadow: "0 6px 0 #2A8CD9, 0 8px 16px rgba(77,172,247,0.3)",
            border: "3px solid #FFFFFF",
            borderRadius: "999px",
            transform: "translateY(0)",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translateY(6px)";
            e.currentTarget.style.boxShadow = "0 0 0 #2A8CD9, 0 4px 8px rgba(77,172,247,0.3)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 0 #2A8CD9, 0 8px 16px rgba(77,172,247,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 0 #2A8CD9, 0 8px 16px rgba(77,172,247,0.3)";
          }}
        >
          ออก
        </button>
      </div>
    </div>
  );
}

