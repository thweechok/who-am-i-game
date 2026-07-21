"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import type { PublicRoomState, ChatMessage } from "@/lib/types";
import { sendAction, getAIAnswer } from "@/lib/api-client";

/* ── PlayerImage — tries proxy, falls back to letter ── */
function PlayerImage({ src, fallbackText }: { src: string; fallbackText: string }) {
  const [failed, setFailed] = useState(false);
  const proxied = `/api/img?url=${encodeURIComponent(src)}`;

  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
        <span className="text-4xl font-black" style={{ color: "#e2e8f0" }}>
          {fallbackText.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      src={proxied}
      alt={fallbackText}
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/* ── Countdown Timer — own state so it never re-renders Playing ─────────── */
const CountdownTimer = memo(function CountdownTimer({
  roundStartedAt,
  roundDurationSeconds,
  onTimeUp,
}: {
  roundStartedAt: number;
  roundDurationSeconds: number;
  onTimeUp: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!roundStartedAt || roundStartedAt === 0) return;
    const endTime = roundStartedAt + roundDurationSeconds * 1000;
    function tick() {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) onTimeUp();
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [roundStartedAt, roundDurationSeconds, onTimeUp]);

  const totalMs = roundDurationSeconds * 1000;
  const pct = totalMs > 0 ? (timeLeft / totalMs) * 100 : 0;
  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  const isUrgent = timeLeft > 0 && timeLeft < 60000;
  const isDanger = timeLeft > 0 && timeLeft < 30000;

  if (!roundStartedAt || roundStartedAt === 0) return null;

  return (
    <div className="mb-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${isDanger ? "rgba(251,113,133,0.4)" : isUrgent ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.07)"}` }}>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-bold" style={{ color: isDanger ? "#fb7185" : isUrgent ? "#fbbf24" : "#94a3b8" }}>
          {isDanger ? "🔴" : isUrgent ? "⚠️" : "⏱️"} เวลา
        </span>
        <span className="text-sm font-black tabular-nums" style={{ color: isDanger ? "#fb7185" : isUrgent ? "#fbbf24" : "#94a3b8" }}>
          {timeLeft === 0 ? "หมดเวลา!" : `${mins}:${String(secs).padStart(2, "0")}`}
        </span>
      </div>
      <div className="h-1" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: isDanger ? "#fb7185" : isUrgent ? "#fbbf24" : "#6366f1",
          }}
        />
      </div>
    </div>
  );
});

/* ── Turn Timer — per-turn countdown (40s default) ── */
const TurnTimer = memo(function TurnTimer({
  turnStartedAt,
  turnTimerSeconds,
  onTurnTimeUp,
  isMyTurn,
}: {
  turnStartedAt: number;
  turnTimerSeconds: number;
  onTurnTimeUp: () => void;
  isMyTurn: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!turnStartedAt || turnStartedAt === 0) return;
    const endTime = turnStartedAt + turnTimerSeconds * 1000;
    function tick() {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) onTurnTimeUp();
    }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [turnStartedAt, turnTimerSeconds, onTurnTimeUp]);

  if (!turnStartedAt || turnStartedAt === 0) return null;

  const secs = Math.ceil(timeLeft / 1000);
  const pct = turnTimerSeconds > 0 ? (timeLeft / (turnTimerSeconds * 1000)) * 100 : 0;
  const isDanger = secs <= 10 && secs > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl mb-3" style={{
      background: isDanger ? "rgba(255,107,107,0.15)" : isMyTurn ? "rgba(255,140,66,0.1)" : "rgba(151,117,250,0.1)",
      border: `2px solid ${isDanger ? "rgba(255,107,107,0.4)" : isMyTurn ? "rgba(255,140,66,0.3)" : "rgba(151,117,250,0.2)"}`,
    }}>
      <span className="text-sm font-bold" style={{ color: isDanger ? "#FF6B6B" : isMyTurn ? "#FF8C42" : "#a89cc8" }}>
        ⏳ ตา{isMyTurn ? "คุณ" : ""}
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full transition-all duration-500 rounded-full" style={{
          width: `${pct}%`,
          background: isDanger ? "#FF6B6B" : isMyTurn ? "#FF8C42" : "#9775FA",
        }} />
      </div>
      <span className={`text-lg font-black tabular-nums ${isDanger ? "animate-pulse" : ""}`} style={{
        color: isDanger ? "#FF6B6B" : "#e2e8f0",
      }}>
        {secs}s
      </span>
    </div>
  );
});

export function Playing({
  room,
  playerId,
  onRefresh,
}: {
  room: PublicRoomState;
  playerId: string;
  onRefresh: () => void;
}) {
  const me = room.players.find((p) => p.id === playerId);
  const isMyTurn = room.currentTurnId === playerId;
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"ask" | "guess">("ask");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ answer: string; reason: string; source: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const amHost = room.hostId === playerId;

  const handleTimeUp = useCallback(() => {
    // Only host or current-turn player sends timeUp to avoid race condition
    if (isMyTurn || amHost) {
      sendAction(room.code, playerId, { type: "timeUp" }).catch(() => {});
    }
  }, [room.code, playerId, isMyTurn, amHost]);

  const handleTurnTimeUp = useCallback(() => {
    // Only current-turn player or host sends turnTimeUp
    if (isMyTurn || amHost) {
      sendAction(room.code, playerId, { type: "turnTimeUp" }).catch(() => {});
    }
  }, [room.code, playerId, isMyTurn, amHost]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room.chat.length]);

  const canAct = !!(me && !me.guessedThisRound && !me.guessedCorrectly);
  // Can I answer? Not my turn, waiting for answer, and I haven't guessed correctly
  const canAnswer =
    !isMyTurn &&
    room.waitingForAnswer &&
    !!(me && !me.guessedCorrectly && !me.isSpectator) &&
    !room.votes[playerId]; // haven't voted yet

  // Vote tracking
  const myVote = room.votes[playerId] ?? null;
  const eligibleVoters = room.players.filter(p =>
    !p.isSpectator && !p.guessedCorrectly && p.id !== room.currentTurnId
  );

  // Last question in chat (shown as context when waiting for answer)
  const lastQuestion = [...room.chat]
    .reverse()
    .find((m) => m.type === "question");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (mode === "guess") {
        await sendAction(room.code, playerId, { type: "guess", text: input });
      } else {
        await sendAction(room.code, playerId, { type: "ask", text: input });
      }
      setInput("");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(val: "yes" | "no" | "maybe") {
    setLoading(true);
    setError("");
    setAiResult(null);
    try {
      await sendAction(room.code, playerId, { type: "answer", text: val });
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAIAnswer() {
    if (!lastQuestion || !room.currentTurnId) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await getAIAnswer(
        room.code,
        playerId,
        lastQuestion.text,
        room.currentTurnId
      );
      setAiResult({ answer: res.answer, reason: res.reason, source: res.source });
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI error");
    } finally {
      setAiLoading(false);
    }
  }

  const cartoonCard = {
    background: "rgba(37,21,69,0.6)",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    border: "2px solid rgba(151,117,250,0.2)",
  };

  const spectators = room.players.filter(p => p.isSpectator);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 animate-fade-in text-[#e2e8f0]">
      <style>{`
        @keyframes pop { 0% {transform: scale(0.95)} 50% {transform: scale(1.05)} 100% {transform: scale(1)} }
        @keyframes bounceGlow { 0%,100%{box-shadow:0 0 0 4px #FF8C42, 0 8px 16px rgba(255,140,66,0.2)} 50%{box-shadow:0 0 0 6px #FF8C42, 0 12px 24px rgba(255,140,66,0.4)} }
      `}</style>

      {/* Timer */}
      <CountdownTimer
        roundStartedAt={room.roundStartedAt ?? 0}
        roundDurationSeconds={room.roundDurationSeconds ?? 420}
        onTimeUp={handleTimeUp}
      />

      <TurnTimer
        turnStartedAt={room.turnStartedAt ?? 0}
        turnTimerSeconds={room.turnTimerSeconds ?? 40}
        onTurnTimeUp={handleTurnTimeUp}
        isMyTurn={isMyTurn}
      />

      {/* ── Player Answer Cards ── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {room.players.filter(p => !p.isSpectator).map((p) => {
          const isMe = p.id === playerId;
          const isCurrent = p.id === room.currentTurnId;
          const answer = isMe ? null : (room.answers[p.id] ?? null);
          const imgUrl = isMe ? null : (room.answerImages?.[p.id] ?? null);
          return (
            <div
              key={p.id}
              className="flex flex-col items-center text-center p-4 transition-all duration-300"
              style={{
                background: isCurrent ? "rgba(255,140,66,0.12)" : "rgba(37,21,69,0.7)",
                borderRadius: "16px",
                border: isCurrent ? "3px solid #FF8C42" : "2px solid rgba(151,117,250,0.2)",
                boxShadow: isCurrent ? "0 0 20px rgba(255,140,66,0.3)" : "0 4px 16px rgba(0,0,0,0.3)",
                opacity: p.guessedCorrectly ? 0.6 : 1,
              }}
            >
              {/* Avatar / Image — SQUARE */}
              <div className="w-full aspect-square rounded-xl overflow-hidden flex items-center justify-center mb-3"
                style={{
                  border: isCurrent ? "4px solid #FF8C42" : "3px solid rgba(151,117,250,0.3)",
                  background: isMe ? "linear-gradient(135deg, #7C3AED, #D946EF)"
                    : imgUrl ? "rgba(26,10,46,0.8)"
                    : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                }}
              >
                {isMe ? (
                  <span className="text-5xl drop-shadow-lg">❓</span>
                ) : imgUrl ? (
                  <PlayerImage src={imgUrl} fallbackText={answer ?? p.name ?? "?"} />
                ) : (
                  <span className="text-4xl font-black" style={{ color: "#e2e8f0" }}>
                    {(answer ?? p.name ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Answer name */}
              <div className="text-base font-black truncate w-full"
                style={{ color: isMe ? "#D946EF" : p.guessedCorrectly ? "#51CF66" : "#ffffff" }}>
                {isMe ? "ทายสิ!" : p.guessedCorrectly ? "✅ ทายถูก" : (answer ?? "?")}
              </div>
              {/* Player name */}
              <div className="text-sm font-bold truncate w-full mt-1" style={{ color: isCurrent ? "#FF8C42" : "#c4b5fd" }}>
                {p.name}
                {isCurrent && <span className="ml-1">🎯</span>}
              </div>
              {/* Score */}
              <div className="text-sm font-black mt-2 rounded-full px-3 py-1" style={{ background: "rgba(77,172,247,0.15)", color: "#74C0FC" }}>
                {p.score} pt
              </div>
            </div>
          );
        })}
      </div>
      
      {spectators.length > 0 && (
        <div className="text-center text-sm font-semibold mt-2" style={{ color: "#a89cc8" }}>
          👀 ผู้ชม: {spectators.map(s => s.name).join(", ")}
        </div>
      )}

      {/* ── Main game area ── */}
      <div className="grid gap-4 md:grid-cols-[1fr_350px]">
        {/* Left: Actions */}
        <div className="space-y-4">
          {/* Turn info banner */}
          <div style={{...cartoonCard, background: isMyTurn ? "#FF8C42" : "rgba(37,21,69,0.6)", border: isMyTurn ? "none" : "2px solid rgba(151,117,250,0.2)"}} className="p-4 rounded-2xl">
            {isMyTurn && !room.waitingForAnswer && canAct ? (
              <div className="text-center">
                <div className="text-xl font-black text-white mb-1 drop-shadow-sm">
                  ✨ ตาคุณ!
                </div>
                <div className="text-sm text-orange-100 font-medium">
                  เลือกถามคำถาม yes/no หรือทายคำตอบ
                </div>
              </div>
            ) : isMyTurn && room.waitingForAnswer ? (
              <div className="text-center text-sm font-bold text-white drop-shadow-sm">
                ⏳ รอผู้เล่นคนอื่นตอบคำถามของคุณ
              </div>
            ) : (
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: "#a89cc8" }}>
                  ⌛ รอตา <span style={{ color: "#FF8C42", fontSize: "1.1em" }}>{room.players.find((p) => p.id === room.currentTurnId)?.name ?? "..."}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── VOTING PANEL — shows when a question is pending ── */}
          {room.waitingForAnswer && room.currentQuestion && (
            <div className="p-5 rounded-2xl animate-slide-up" style={{ ...cartoonCard, border: "2px solid rgba(77,172,247,0.4)", background: "rgba(77,172,247,0.08)" }}>
              <div className="text-xs font-black mb-1" style={{ color: "#74C0FC" }}>
                ❓ คำถามจาก {room.players.find(p => p.id === room.currentTurnId)?.name}
              </div>
              <div className="text-lg font-black mb-4" style={{ color: "#ffffff" }}>
                {room.currentQuestion}
              </div>

              {/* Show all voters and their status */}
              <div className="space-y-2 mb-4">
                {eligibleVoters.map(p => {
                  const vote = room.votes[p.id];
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: vote ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black" style={{ background: vote ? (vote === "yes" ? "rgba(81,207,102,0.2)" : vote === "no" ? "rgba(255,107,107,0.2)" : "rgba(255,212,59,0.2)") : "rgba(151,117,250,0.15)", color: vote ? "#fff" : "#a89cc8" }}>
                        {vote ? (vote === "yes" ? "✅" : vote === "no" ? "❌" : "🤔") : "⏳"}
                      </div>
                      <span className="font-bold text-sm" style={{ color: "#e2e8f0" }}>{p.name}</span>
                      <span className="ml-auto text-xs font-bold" style={{ color: vote ? (vote === "yes" ? "#51CF66" : vote === "no" ? "#FF6B6B" : "#FFD43B") : "#7c6aab" }}>
                        {vote ? (vote === "yes" ? "ใช่" : vote === "no" ? "ไม่ใช่" : "ไม่รู้") : "รอตอบ..."}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Vote buttons — only if I can answer */}
              {canAnswer && (
                <>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { val: "yes" as const, label: "✅ ใช่", bg: "#51CF66", shadow: "#37B24D" },
                    { val: "no" as const, label: "❌ ไม่ใช่", bg: "#FF6B6B", shadow: "#F03E3E" },
                    { val: "maybe" as const, label: "🤷 ไม่รู้", bg: "#FFD43B", shadow: "#F59F00" },
                  ] as const).map(({ val, label, bg, shadow }) => (
                    <button
                      key={val}
                      id={`btn-vote-${val}`}
                      onClick={() => handleAnswer(val)}
                      disabled={loading}
                      className="py-3 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: bg, color: "#1a0a2e", boxShadow: `0 4px 0 ${shadow}`, border: "none" }}
                      onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(4px)"; e.currentTarget.style.boxShadow = "none"; }}
                      onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 0 ${shadow}`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 0 ${shadow}`; }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* AI Help button */}
                <button
                  id="btn-ai-answer"
                  onClick={handleAIAnswer}
                  disabled={aiLoading || loading}
                  className="mt-3 w-full py-3 rounded-full text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(77,172,247,0.12)",
                    border: "2px solid rgba(116,192,252,0.3)",
                    color: "#74C0FC",
                  }}
                >
                  {aiLoading ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-[#74C0FC] border-t-transparent animate-spin" />กำลังถาม AI...</>
                  ) : (
                    <>🤖 ไม่รู้? ถาม AI ช่วยตอบ</>
                  )}
                </button>

                {/* AI result card */}
                {aiResult && (
                  <div className="mt-3 rounded-xl p-4 animate-slide-up" style={{ background: "rgba(77,172,247,0.1)", border: "2px solid rgba(116,192,252,0.3)" }}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">🤖</span>
                      <div>
                        <p className="text-sm font-black mb-1" style={{ color: "#74C0FC" }}>
                          AI แนะนำ:{" "}
                          <span style={{ color: aiResult.answer === "yes" ? "#51CF66" : aiResult.answer === "no" ? "#FF6B6B" : "#FFD43B" }}>
                            {aiResult.answer === "yes" ? "✅ ใช่" : aiResult.answer === "no" ? "❌ ไม่ใช่" : "🤷 ไม่รู้"}
                          </span>
                        </p>
                        <p className="text-xs font-medium leading-relaxed" style={{ color: "#c4b5fd" }}>{aiResult.reason}</p>
                        <p className="text-[10px] mt-2 font-bold" style={{ color: "#7c6aab" }}>กดปุ่มด้านบนเพื่อยืนยันคำตอบ</p>
                      </div>
                    </div>
                  </div>
                )}
                </>
              )}

              {/* Already voted indicator */}
              {myVote && !isMyTurn && (
                <div className="text-center py-2 text-sm font-bold" style={{ color: "#51CF66" }}>
                  ✅ คุณตอบแล้ว — รอคนอื่น
                </div>
              )}

              {/* Asker sees voting progress */}
              {isMyTurn && (
                <div className="text-center py-2 text-sm font-bold" style={{ color: "#74C0FC" }}>
                  ⏳ รอทุกคนตอบ ({Object.keys(room.votes).length}/{eligibleVoters.length})
                </div>
              )}
            </div>
          )}

          {/* ── Q&A History — only MY questions ── */}
          {(() => {
            const qaItems: { q: string; a: string }[] = [];
            for (let i = 0; i < room.chat.length; i++) {
              const msg = room.chat[i];
              if (msg.type === "question" && msg.fromId === playerId) {
                const ans = room.chat.find((m, j) => j > i && m.type === "answer");
                qaItems.push({ q: msg.text, a: ans?.text ?? "⏳" });
              }
            }
            if (qaItems.length === 0) return null;
            return (
              <div className="rounded-2xl p-4 space-y-2" style={{ ...cartoonCard, maxHeight: "220px", overflowY: "auto" }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#7c6aab" }}>📋 คำถามของคุณ ({qaItems.length})</div>
                {qaItems.map((item, i) => (
                  <div key={i} className="rounded-xl px-3 py-2" style={{ background: "rgba(26,10,46,0.4)", borderLeft: "3px solid #4DACF7" }}>
                    <div className="text-sm font-bold" style={{ color: "#74C0FC" }}>
                      {i + 1}. {item.q}
                    </div>
                    <div className="text-xs font-bold mt-1" style={{ color: "#c4b5fd" }}>
                      → {item.a}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Action panel */}
          <div style={cartoonCard} className="p-5 rounded-2xl">
          {/* Locked out */}
          {!canAct ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">
                {me?.guessedCorrectly ? "🎉" : "😴"}
              </div>
              <p className="text-base font-bold text-[#a89cc8]">
                {me?.guessedCorrectly
                  ? "คุณทายถูกแล้ว! รอจบรอบ"
                  : "คุณทายไปแล้วในรอบนี้ รอจบรอบ"}
              </p>
            </div>
          ) : /* Not my turn or waiting */
          isMyTurn && !room.waitingForAnswer ? (
            /* My turn — ask or guess */
            <div className="animate-slide-up">
              <div
                className="flex gap-2 mb-4 bg-[rgba(37,21,69,0.4)] p-1.5 rounded-full"
              >
                {(["ask", "guess"] as const).map((m) => (
                  <button
                    key={m}
                    id={`tab-action-${m}`}
                    onClick={() => setMode(m)}
                    className="flex-1 py-2 rounded-full text-sm font-black transition-all duration-200"
                    style={
                      mode === m
                        ? {
                            background: m === "guess" ? "#FF6B6B" : "#4DACF7",
                            color: "#FFF",
                            boxShadow: `0 3px 0 ${m === "guess" ? "#F03E3E" : "#228BE6"}`,
                          }
                        : { color: "#a89cc8", background: "transparent" }
                    }
                  >
                    {m === "ask" ? "❓ ถาม" : "🎯 ทาย (เสี่ยง!)"}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  id="input-action"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    mode === "ask" ? "พิมพ์คำถาม yes/no..." : "ทายว่าคุณคือใคร..."
                  }
                  className="flex-1 rounded-full px-4 py-3 text-sm text-[#e2e8f0] font-medium outline-none transition-all duration-200"
                  style={{
                    background: "rgba(37,21,69,0.6)",
                    border: "2px solid rgba(151,117,250,0.2)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = mode === "guess" ? "#FF6B6B" : "#4DACF7";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(151,117,250,0.15)";
                  }}
                />
                <button
                  id={`btn-send-${mode}`}
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 rounded-full text-sm font-black text-white disabled:opacity-50 transition-all duration-150"
                  style={{
                    background: mode === "guess" ? "#FF6B6B" : "#4DACF7",
                    boxShadow: `0 4px 0 ${mode === "guess" ? "#F03E3E" : "#228BE6"}`,
                    border: "none"
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(4px)"; e.currentTarget.style.boxShadow = "none"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 0 ${mode === "guess" ? "#F03E3E" : "#228BE6"}`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 0 ${mode === "guess" ? "#F03E3E" : "#228BE6"}`; }}
                >
                  {mode === "guess" ? "ทาย!" : "ส่ง"}
                </button>
              </form>
              {mode === "guess" && (
                <p
                  className="mt-3 text-xs font-bold text-center rounded-xl px-3 py-2 animate-fade-in"
                  style={{ background: "rgba(255,107,107,0.1)", color: "#FF8787", border: "2px dashed #FF8787" }}
                >
                  ⚠ ถ้าทาย จะหมดสิทธิ์ถามในรอบนี้ทันที
                </p>
              )}
            </div>
          ) : (
            /* Not my turn, not waiting — just wait */
            <div className="text-center py-6">
              <div className="text-4xl mb-3" style={{ animation: "pop 2s infinite" }}>⌛</div>
              <p className="text-base font-bold" style={{ color: "#a89cc8" }}>
                รอตา{" "}
                <span style={{ color: "#FF8C42" }}>
                  {room.players.find((p) => p.id === room.currentTurnId)?.name ?? "..."}
                </span>
              </p>
            </div>
          )}

          {error && (
            <div
              className="mt-3 rounded-xl px-4 py-3 text-sm font-bold animate-fade-in text-center"
              style={{ background: "rgba(255,107,107,0.15)", color: "#C92A2A", border: "2px solid #FF8787" }}
            >
              {error}
            </div>
          )}
          </div>
        </div>

        {/* Right column: Chat */}
        <ChatPanel chat={room.chat} playerId={playerId} chatEndRef={chatEndRef} />
      </div>
    </div>
  );
}

function ChatPanel({
  chat,
  playerId,
  chatEndRef,
}: {
  chat: ChatMessage[];
  playerId: string;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className="rounded-2xl flex flex-col h-[460px] md:h-auto md:max-h-[600px]"
      style={{
        background: "rgba(37,21,69,0.6)",
        border: "2px solid #A5D8FF",
        boxShadow: "0 4px 12px rgba(77,172,247,0.15)",
      }}
    >
      <div
        className="px-4 py-3 text-sm font-black text-center"
        style={{ borderBottom: "2px solid #A5D8FF", color: "#FF8C42", background: "rgba(77,172,247,0.12)", borderTopLeftRadius: "14px", borderTopRightRadius: "14px" }}
      >
        💬 แชต
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: "rgba(37,21,69,0.4)", borderBottomLeftRadius: "14px", borderBottomRightRadius: "14px" }}>
        {chat.map((m, i) => (
          <ChatBubble key={m.id} msg={m} isMe={m.fromId === playerId} index={i} />
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}

function ChatBubble({
  msg,
  isMe,
  index,
}: {
  msg: ChatMessage;
  isMe: boolean;
  index: number;
}) {
  const style = (() => {
    if (msg.type === "system") {
      return {
        background: "rgba(255,255,255,0.08)",
        color: "#495057",
        border: "1px solid #DEE2E6",
        boxShadow: "0 2px 0 #DEE2E6"
      };
    }
    if (msg.type === "question") {
      return {
        background: isMe ? "rgba(77,172,247,0.2)" : "rgba(77,172,247,0.12)",
        color: "#74C0FC",
        border: `2px solid ${isMe ? "#74C0FC" : "#A5D8FF"}`,
        boxShadow: `0 2px 0 ${isMe ? "#74C0FC" : "#A5D8FF"}`
      };
    }
    if (msg.type === "answer") {
      if (msg.text === "yes") {
        return { background: "rgba(81,207,102,0.2)", color: "#2B8A3E", border: "2px solid #8CE99A", boxShadow: "0 2px 0 #8CE99A" };
      } else if (msg.text === "no") {
        return { background: "rgba(255,107,107,0.15)", color: "#C92A2A", border: "2px solid rgba(255,107,107,0.3)", boxShadow: "0 2px 0 #FFC9C9" };
      } else {
        return { background: "rgba(255,212,59,0.2)", color: "#E67700", border: "2px solid #FFEC99", boxShadow: "0 2px 0 #FFEC99" };
      }
    }
    // guess
    return msg.correct
      ? { background: "rgba(81,207,102,0.2)", color: "#2B8A3E", border: "2px solid #8CE99A", boxShadow: "0 2px 0 #8CE99A" }
      : { background: "rgba(255,107,107,0.15)", color: "#C92A2A", border: "2px solid rgba(255,107,107,0.3)", boxShadow: "0 2px 0 #FFC9C9" };
  })();

  const icon =
    msg.type === "question"
      ? "❓"
      : msg.type === "answer"
      ? msg.text === "yes" ? "✅" : msg.text === "no" ? "❌" : "🤔"
      : msg.type === "guess"
      ? msg.correct ? "🎊" : "🎯"
      : "💬";

  return (
    <div
      className="rounded-2xl px-4 py-2 text-sm font-bold animate-slide-in-right"
      style={{ ...style, animationDelay: `${Math.min(index * 20, 300)}ms` }}
    >
      {msg.type !== "system" && (
        <span className="font-black mr-2" style={{ color: isMe ? "#1971C2" : "#495057" }}>
          {msg.fromName}:
        </span>
      )}
      <span>
        {icon}{" "}
        {msg.type === "answer"
          ? msg.text === "yes" ? "ใช่" : msg.text === "no" ? "ไม่ใช่" : "ไม่รู้"
          : msg.text}
      </span>
    </div>
  );
}
