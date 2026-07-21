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

  const cartoonCard = {
    background: "rgba(37,21,69,0.6)",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    border: "2px solid rgba(151,117,250,0.2)",
  };

  const spectators = room.players.filter(p => p.isSpectator);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 animate-fade-in text-[#2D3436]">
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

      {/* ── Player Answer Cards ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(room.players.filter(p=>!p.isSpectator).length, 6)}, 1fr)` }}>
        {room.players.filter(p => !p.isSpectator).map((p) => {
          const isMe = p.id === playerId;
          const isCurrent = p.id === room.currentTurnId;
          const answer = isMe ? null : (room.answers[p.id] ?? null);
          const imgUrl = isMe ? null : (room.answerImages?.[p.id] ?? null);
          return (
            <div
              key={p.id}
              className="flex flex-col items-center text-center p-3 rounded-2xl transition-all duration-300"
              style={{
                background: "rgba(37,21,69,0.6)",
                borderRadius: "16px",
                border: isCurrent ? "2px solid #FF8C42" : "2px solid rgba(151,117,250,0.2)",
                boxShadow: isCurrent ? "0 0 0 4px #FF8C42, 0 8px 16px rgba(255,140,66,0.3)" : "0 4px 12px rgba(0,0,0,0.08)",
                animation: isCurrent ? "bounceGlow 2s ease-in-out infinite" : undefined,
                opacity: p.guessedCorrectly ? 0.5 : 1,
              }}
            >
              {/* Avatar / Image */}
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center mb-2 flex-shrink-0"
                style={{
                  border: isCurrent ? "4px solid #FF8C42" : "3px solid #E0E0E0",
                  background: isMe ? "linear-gradient(135deg, #A855F7, #D946EF)" : "rgba(26,10,46,0.8)",
                }}
              >
                {isMe ? (
                  <span className="text-3xl text-white font-bold drop-shadow-md">❓</span>
                ) : imgUrl ? (
                  <img src={imgUrl} alt="" className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <span className="text-3xl">🤡</span>
                )}
              </div>
              {/* Answer name */}
              <div className="text-sm font-black truncate w-full px-1"
                style={{ color: isMe ? "#D946EF" : p.guessedCorrectly ? "#51CF66" : "#e2e8f0" }}>
                {isMe ? "ทายสิ!" : p.guessedCorrectly ? "✅ ทายถูก" : (answer ?? "?")}
              </div>
              {/* Player name */}
              <div className="text-xs font-semibold truncate w-full mt-1" style={{ color: isCurrent ? "#FF8C42" : "#a89cc8" }}>
                {isMe ? "คุณ" : p.name}
                {isCurrent && <span className="ml-1">🎯</span>}
              </div>
              {/* Score */}
              <div className="text-xs font-black mt-1 bg-slate-100 rounded-full px-2 py-0.5" style={{ color: "#4DACF7" }}>
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

          {/* Waiting for answer banner */}
          {room.waitingForAnswer && lastQuestion && !isMyTurn && (
            <div className="p-4 rounded-2xl" style={{ ...cartoonCard, border: "2px solid #FFD43B", background: "#FFFDF0" }}>
              <div className="text-xs font-black mb-2" style={{ color: "#F59F00" }}>
                ⏳ รอคำตอบ
              </div>
              <div className="text-lg font-black" style={{ color: "#e2e8f0" }}>❓ {lastQuestion.text}</div>
              <div className="text-xs mt-2 font-semibold" style={{ color: "#a89cc8" }}>ถามโดย {lastQuestion.fromName}</div>
            </div>
          )}

          {/* Action panel */}
          <div style={cartoonCard} className="p-5 rounded-2xl">
          {/* Locked out */}
          {!canAct ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">
                {me?.guessedCorrectly ? "🎉" : "😴"}
              </div>
              <p className="text-base font-bold text-slate-500">
                {me?.guessedCorrectly
                  ? "คุณทายถูกแล้ว! รอจบรอบ"
                  : "คุณทายไปแล้วในรอบนี้ รอจบรอบ"}
              </p>
            </div>
          ) : /* Not my turn — show answer buttons if waiting */
          canAnswer ? (
            <div className="animate-slide-up">
              <p className="text-sm font-black mb-3" style={{ color: "#4DACF7" }}>
                ตอบคำถาม
              </p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { val: "yes" as const, label: "✅ ใช่", color: "rgba(37,21,69,0.6)", bg: "#51CF66", shadow: "#37B24D" },
                  { val: "no" as const, label: "❌ ไม่ใช่", color: "rgba(37,21,69,0.6)", bg: "#FF6B6B", shadow: "#F03E3E" },
                  { val: "maybe" as const, label: "🤔 อาจจะ", color: "#e2e8f0", bg: "#FFD43B", shadow: "#F59F00" },
                ] as const).map(({ val, label, color, bg, shadow }) => (
                  <button
                    key={val}
                    id={`btn-answer-${val}`}
                    onClick={() => handleAnswer(val)}
                    disabled={loading}
                    className="py-3 rounded-full text-sm font-black transition-all duration-150 disabled:opacity-50"
                    style={{
                      background: bg,
                      color,
                      border: "none",
                      boxShadow: aiResult?.answer === val ? `0 6px 0 ${shadow}, 0 0 15px ${bg}` : `0 4px 0 ${shadow}`,
                      transform: aiResult?.answer === val ? "scale(1.05) translateY(-2px)" : "none",
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(4px)"; e.currentTarget.style.boxShadow = "none"; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = aiResult?.answer === val ? "scale(1.05) translateY(-2px)" : ""; e.currentTarget.style.boxShadow = aiResult?.answer === val ? `0 6px 0 ${shadow}, 0 0 15px ${bg}` : `0 4px 0 ${shadow}`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = aiResult?.answer === val ? "scale(1.05) translateY(-2px)" : ""; e.currentTarget.style.boxShadow = aiResult?.answer === val ? `0 6px 0 ${shadow}, 0 0 15px ${bg}` : `0 4px 0 ${shadow}`; }}
                  >
                    {label}
                    {aiResult?.answer === val && (
                      <span className="ml-1 text-[10px] opacity-90 block mt-1">← AI แนะนำ</span>
                    )}
                  </button>
                ))}
              </div>

              {/* AI Help button */}
              <button
                id="btn-ai-answer"
                onClick={handleAIAnswer}
                disabled={aiLoading || loading}
                className="mt-4 w-full py-3 rounded-full text-sm font-bold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: "#E7F5FF",
                  border: "2px solid #74C0FC",
                  color: "#1C7ED6",
                  boxShadow: "0 4px 0 #74C0FC",
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(4px)"; e.currentTarget.style.boxShadow = "none"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 0 #74C0FC"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 0 #74C0FC"; }}
              >
                {aiLoading ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-[#1C7ED6] border-t-transparent animate-spin" />กำลังถาม AI...</>
                ) : (
                  <>🤖 ไม่รู้? ถาม AI ช่วยตอบ</>
                )}
              </button>

              {/* AI result card */}
              {aiResult && (
                <div
                  className="mt-3 rounded-xl p-4 animate-slide-up"
                  style={{ background: "#E7F5FF", border: "2px solid #74C0FC" }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">🤖</span>
                    <div>
                      <p className="text-sm font-black text-[#1C7ED6] mb-1">
                        AI แนะนำ:{" "}
                        <span style={{ color: aiResult.answer === "yes" ? "#2B8A3E" : aiResult.answer === "no" ? "#C92A2A" : "#B08800" }}>
                          {aiResult.answer === "yes" ? "✅ ใช่" : aiResult.answer === "no" ? "❌ ไม่ใช่" : "🤔 อาจจะ"}
                        </span>
                      </p>
                      <p className="text-xs text-[#2D3436] font-medium leading-relaxed">{aiResult.reason}</p>
                      <p className="text-[10px] text-[#636E72] mt-2 font-bold">กดปุ่มด้านบนเพื่อยืนยันคำตอบ</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : isMyTurn && !room.waitingForAnswer ? (
            /* My turn — ask or guess */
            <div className="animate-slide-up">
              <div
                className="flex gap-2 mb-4 bg-slate-100 p-1.5 rounded-full"
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
                  className="flex-1 rounded-full px-4 py-3 text-sm text-[#2D3436] font-medium outline-none transition-all duration-200"
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
                  style={{ background: "#FFF5F5", color: "#E03131", border: "2px dashed #FF8787" }}
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
        style={{ borderBottom: "2px solid #A5D8FF", color: "#FF8C42", background: "#E7F5FF", borderTopLeftRadius: "14px", borderTopRightRadius: "14px" }}
      >
        💬 แชต
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: "#F8F9FA", borderBottomLeftRadius: "14px", borderBottomRightRadius: "14px" }}>
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
        background: "#E9ECEF",
        color: "#495057",
        border: "1px solid #DEE2E6",
        boxShadow: "0 2px 0 #DEE2E6"
      };
    }
    if (msg.type === "question") {
      return {
        background: isMe ? "#D0EBFF" : "#E7F5FF",
        color: "#1C7ED6",
        border: `2px solid ${isMe ? "#74C0FC" : "#A5D8FF"}`,
        boxShadow: `0 2px 0 ${isMe ? "#74C0FC" : "#A5D8FF"}`
      };
    }
    if (msg.type === "answer") {
      if (msg.text === "yes") {
        return { background: "#D3F9D8", color: "#2B8A3E", border: "2px solid #8CE99A", boxShadow: "0 2px 0 #8CE99A" };
      } else if (msg.text === "no") {
        return { background: "rgba(255,107,107,0.15)", color: "#C92A2A", border: "2px solid rgba(255,107,107,0.3)", boxShadow: "0 2px 0 #FFC9C9" };
      } else {
        return { background: "#FFF3BF", color: "#E67700", border: "2px solid #FFEC99", boxShadow: "0 2px 0 #FFEC99" };
      }
    }
    // guess
    return msg.correct
      ? { background: "#D3F9D8", color: "#2B8A3E", border: "2px solid #8CE99A", boxShadow: "0 2px 0 #8CE99A" }
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
          ? msg.text === "yes" ? "ใช่" : msg.text === "no" ? "ไม่ใช่" : "อาจจะ"
          : msg.text}
      </span>
    </div>
  );
}
