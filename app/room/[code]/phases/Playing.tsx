"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import type { PublicRoomState, ChatMessage } from "@/lib/types";
import { sendAction, getAIAnswer } from "@/lib/api-client";

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
        <span className="text-xs font-bold" style={{ color: isDanger ? "#fb7185" : isUrgent ? "#fbbf24" : "#64748b" }}>
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room.chat.length]);

  const canAct = !!(me && !me.guessedThisRound && !me.guessedCorrectly);
  // Can I answer? Not my turn, waiting for answer, and I haven't guessed correctly
  const canAnswer =
    !isMyTurn &&
    room.waitingForAnswer &&
    !!(me && !me.guessedCorrectly);

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

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1rem",
  };

  return (
    <div className="w-full max-w-2xl grid gap-4 md:grid-cols-[1fr_320px] animate-fade-in">
      {/* ── Left column ── */}
      <div className="space-y-3">
        {/* Timer */}
        <CountdownTimer
          roundStartedAt={room.roundStartedAt ?? 0}
          roundDurationSeconds={room.roundDurationSeconds ?? 420}
          onTimeUp={handleTimeUp}
        />
        {/* My answer card */}
        <div
          className="p-4 text-center"
          style={{
            ...cardStyle,
            background: "rgba(99,102,241,0.07)",
            border: "1px solid rgba(99,102,241,0.25)",
            boxShadow: "0 0 24px rgba(99,102,241,0.12)",
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 mb-1">
            คำตอบบนหัวคุณ
          </div>
          <div className="text-xl font-bold text-indigo-200">
            {room.myAnswer === null ? "❓ ยังไม่รู้ — ต้องทาย!" : room.myAnswer}
          </div>
        </div>

        {/* Waiting for answer banner */}
        {room.waitingForAnswer && lastQuestion && (
          <div
            className="p-4 animate-slide-up"
            style={{
              ...cardStyle,
              background: "rgba(251,191,36,0.07)",
              border: "1px solid rgba(251,191,36,0.25)",
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70 mb-1.5">
              <span className="animate-blink mr-1">⏳</span> รอคำตอบ
            </div>
            <div className="text-sm font-semibold text-amber-200">
              ❓ {lastQuestion.text}
            </div>
            <div className="text-xs text-amber-500/70 mt-1">
              ถามโดย {lastQuestion.fromName} — รอให้คนอื่นตอบ yes/no
            </div>
          </div>
        )}

        {/* Turn indicator */}
        <div style={cardStyle} className="p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">ตาปัจจุบัน</div>
          <div className="flex items-center gap-3">
            {room.players.map((p) => {
              const isCurrent = p.id === room.currentTurnId;
              const isLocked = p.guessedCorrectly || p.guessedThisRound;
              return (
                <div
                  key={p.id}
                  className="flex flex-col items-center gap-1 transition-all duration-300"
                  style={{ opacity: isLocked && !isCurrent ? 0.35 : 1 }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300"
                    style={
                      isCurrent
                        ? {
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            boxShadow: "0 0 0 3px rgba(99,102,241,0.4), 0 0 20px rgba(99,102,241,0.3)",
                            animation: "pulseRing 2.2s ease-in-out infinite",
                          }
                        : p.guessedCorrectly
                        ? { background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.3)" }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    {p.guessedCorrectly ? "✓" : p.name.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className="text-[9px] font-medium truncate max-w-12 text-center"
                    style={{
                      color: isCurrent ? "#818cf8" : p.guessedCorrectly ? "#34d399" : "#64748b",
                    }}
                  >
                    {p.id === playerId ? "คุณ" : p.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
          {isMyTurn && !room.waitingForAnswer && canAct && (
            <div
              className="mt-3 text-xs font-semibold animate-pulse-ring rounded-lg px-3 py-1.5 text-center"
              style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
            >
              ✨ ตาคุณ! เลือกถามหรือทาย
            </div>
          )}
          {isMyTurn && room.waitingForAnswer && (
            <div
              className="mt-3 text-xs rounded-lg px-3 py-1.5 text-center"
              style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24" }}
            >
              รอผู้เล่นคนอื่นตอบคำถามของคุณก่อน
            </div>
          )}
        </div>

        {/* Scoreboard */}
        <div style={cardStyle} className="p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            คะแนน · รอบ {room.round}
          </div>
          <div className="space-y-2">
            {[...room.players]
              .sort((a, b) => b.score - a.score)
              .map((p, rank) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200"
                  style={{
                    background: p.id === playerId
                      ? "rgba(99,102,241,0.08)"
                      : "rgba(255,255,255,0.03)",
                    border: p.id === playerId
                      ? "1px solid rgba(99,102,241,0.2)"
                      : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span
                    className="w-5 text-center text-xs font-mono font-bold"
                    style={{ color: rank === 0 ? "#fbbf24" : rank === 1 ? "#94a3b8" : rank === 2 ? "#b45309" : "#475569" }}
                  >
                    {rank + 1}
                  </span>
                  <span
                    className="flex-1 text-sm font-medium truncate"
                    style={{
                      color: p.guessedCorrectly
                        ? "#34d399"
                        : p.guessedThisRound
                        ? "#475569"
                        : "#cbd5e1",
                      textDecoration: p.guessedThisRound && !p.guessedCorrectly ? "line-through" : "none",
                    }}
                  >
                    {p.name}
                    {p.id === playerId && <span className="ml-1 text-indigo-400 text-xs">(คุณ)</span>}
                    {p.guessedCorrectly && <span className="ml-1 text-[10px]">✅</span>}
                  </span>
                  <span className="font-mono font-bold text-sm" style={{ color: "#818cf8" }}>
                    {p.score}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Action panel */}
        <div style={cardStyle} className="p-4">
          {/* Locked out */}
          {!canAct ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-2">
                {me?.guessedCorrectly ? "🎉" : "😴"}
              </div>
              <p className="text-sm text-slate-500">
                {me?.guessedCorrectly
                  ? "คุณทายถูกแล้ว! รอจบรอบ"
                  : "คุณทายไปแล้วในรอบนี้ รอจบรอบ"}
              </p>
            </div>
          ) : /* Not my turn — show answer buttons if waiting */
          canAnswer ? (
            <div className="animate-slide-up">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">
                ตอบคำถาม
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { val: "yes" as const, label: "✅ ใช่", color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" },
                  { val: "no" as const, label: "❌ ไม่ใช่", color: "#fb7185", bg: "rgba(251,113,133,0.12)", border: "rgba(251,113,133,0.3)" },
                  { val: "maybe" as const, label: "🤔 อาจจะ", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)" },
                ] as const).map(({ val, label, color, bg, border }) => (
                  <button
                    key={val}
                    id={`btn-answer-${val}`}
                    onClick={() => handleAnswer(val)}
                    disabled={loading}
                    className="py-2.5 rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-40"
                    style={{
                      background: aiResult?.answer === val ? bg.replace("0.12","0.25") : bg,
                      color, border: `1px solid ${border}`,
                      boxShadow: aiResult?.answer === val ? `0 0 12px ${bg}` : "none",
                      transform: aiResult?.answer === val ? "scale(1.05)" : "none",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = aiResult?.answer === val ? "scale(1.05)" : ""; }}
                  >
                    {label}
                    {aiResult?.answer === val && (
                      <span className="ml-1 text-[10px] opacity-70">← AI</span>
                    )}
                  </button>
                ))}
              </div>

              {/* AI Help button */}
              <button
                id="btn-ai-answer"
                onClick={handleAIAnswer}
                disabled={aiLoading || loading}
                className="mt-3 w-full py-2 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{
                  background: aiLoading ? "rgba(56,189,248,0.08)" : "rgba(56,189,248,0.06)",
                  border: "1px solid rgba(56,189,248,0.2)",
                  color: "#38bdf8",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(56,189,248,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(56,189,248,0.06)"; }}
              >
                {aiLoading ? (
                  <><span className="w-3 h-3 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />กำลังถาม AI...</>
                ) : (
                  <>🤖 ไม่รู้? ถาม AI ช่วยตอบ</>
                )}
              </button>

              {/* AI result card */}
              {aiResult && (
                <div
                  className="mt-2 rounded-xl p-3 animate-slide-up"
                  style={{ background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.2)" }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">🤖</span>
                    <div>
                      <p className="text-xs font-bold text-cyan-300 mb-0.5">
                        AI แนะนำ:{" "}
                        <span style={{ color: aiResult.answer === "yes" ? "#34d399" : aiResult.answer === "no" ? "#fb7185" : "#fbbf24" }}>
                          {aiResult.answer === "yes" ? "✅ ใช่" : aiResult.answer === "no" ? "❌ ไม่ใช่" : "🤔 อาจจะ"}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{aiResult.reason}</p>
                      <p className="text-[10px] text-slate-600 mt-1">กดปุ่มด้านบนเพื่อยืนยันคำตอบ</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : isMyTurn && !room.waitingForAnswer ? (
            /* My turn — ask or guess */
            <div className="animate-slide-up">
              <div
                className="flex gap-1 p-1 rounded-xl mb-3"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                {(["ask", "guess"] as const).map((m) => (
                  <button
                    key={m}
                    id={`tab-action-${m}`}
                    onClick={() => setMode(m)}
                    className="flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={
                      mode === m
                        ? {
                            background:
                              m === "guess"
                                ? "linear-gradient(135deg, #f43f5e, #fb7185)"
                                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "#fff",
                            boxShadow:
                              m === "guess"
                                ? "0 4px 12px rgba(244,63,94,0.4)"
                                : "0 4px 12px rgba(99,102,241,0.4)",
                          }
                        : { color: "#64748b" }
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
                  className="flex-1 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = mode === "guess" ? "#f43f5e" : "#6366f1";
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${mode === "guess" ? "rgba(244,63,94,0.2)" : "rgba(99,102,241,0.2)"}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  id={`btn-send-${mode}`}
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all duration-150"
                  style={{
                    background:
                      mode === "guess"
                        ? "linear-gradient(135deg, #f43f5e, #fb7185)"
                        : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    boxShadow:
                      mode === "guess"
                        ? "0 4px 12px rgba(244,63,94,0.35)"
                        : "0 4px 12px rgba(99,102,241,0.35)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                >
                  {mode === "guess" ? "ทาย!" : "ส่ง"}
                </button>
              </form>
              {mode === "guess" && (
                <p
                  className="mt-2 text-xs rounded-lg px-3 py-1.5 animate-fade-in"
                  style={{ background: "rgba(251,113,133,0.08)", color: "#fb7185" }}
                >
                  ⚠ ถ้าทาย จะหมดสิทธิ์ถามในรอบนี้ทันที
                </p>
              )}
            </div>
          ) : (
            /* Not my turn, not waiting — just wait */
            <div className="text-center py-4">
              <div className="text-2xl mb-2 animate-float">⌛</div>
              <p className="text-sm text-slate-500">
                รอตา{" "}
                <span className="text-slate-300 font-medium">
                  {room.players.find((p) => p.id === room.currentTurnId)?.name ?? "..."}
                </span>
              </p>
            </div>
          )}

          {error && (
            <div
              className="mt-3 rounded-xl px-3 py-2 text-sm animate-fade-in"
              style={{ background: "rgba(251,113,133,0.1)", color: "#fb7185" }}
            >
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Right column: Chat ── */}
      <ChatPanel chat={room.chat} playerId={playerId} chatEndRef={chatEndRef} />
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
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        💬 แชต
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
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
        background: "rgba(251,191,36,0.08)",
        color: "#fbbf24",
        border: "1px solid rgba(251,191,36,0.15)",
      };
    }
    if (msg.type === "question") {
      return {
        background: isMe ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)",
        color: "#a5b4fc",
        border: `1px solid rgba(99,102,241,${isMe ? 0.4 : 0.2})`,
      };
    }
    if (msg.type === "answer") {
      return {
        background: "rgba(255,255,255,0.05)",
        color: "#94a3b8",
        border: "1px solid rgba(255,255,255,0.08)",
      };
    }
    // guess
    return msg.correct
      ? { background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }
      : { background: "rgba(251,113,133,0.1)", color: "#fb7185", border: "1px solid rgba(251,113,133,0.2)" };
  })();

  const icon =
    msg.type === "question"
      ? "❓"
      : msg.type === "answer"
      ? msg.text === "yes" ? "✅" : msg.text === "no" ? "❌" : "🤔"
      : msg.type === "guess"
      ? "🎯"
      : "💬";

  return (
    <div
      className="rounded-xl px-3 py-2 text-xs leading-relaxed animate-slide-in-right"
      style={{ ...style, animationDelay: `${Math.min(index * 20, 300)}ms` }}
    >
      {msg.type !== "system" && (
        <span className="font-bold mr-1" style={{ color: isMe ? "#818cf8" : "#94a3b8" }}>
          {msg.fromName}:
        </span>
      )}
      <span>
        {icon}{" "}
        {msg.type === "answer"
          ? msg.text === "yes" ? "ใช่" : msg.text === "no" ? "ไม่ใช่" : "อาจจะ"
          : msg.text}
      </span>
    </div>
  );
}
