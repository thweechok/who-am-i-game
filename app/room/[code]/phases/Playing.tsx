"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicRoomState, ChatMessage } from "@/lib/types";
import { sendAction } from "@/lib/api-client";

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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room.chat.length]);

  const canAct = me && !me.guessedThisRound && !me.guessedCorrectly;
  const myAnswerHidden = room.myAnswer === null; // server hides own answer

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
    try {
      await sendAction(room.code, playerId, { type: "answer", text: val });
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl grid gap-4 md:grid-cols-[1fr_320px]">
      {/* main: my card + actions */}
      <div className="space-y-4">
        {/* my head card */}
        <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50 p-5 text-center dark:border-indigo-700 dark:bg-indigo-950/40">
          <div className="text-xs uppercase tracking-wide text-indigo-500">
            คำตอบบนหัวคุณ
          </div>
          <div className="mt-1 text-xl font-semibold text-indigo-900 dark:text-indigo-200">
            {myAnswerHidden ? "❓ ยังไม่รู้ (ต้องทาย)" : room.myAnswer}
          </div>
        </div>

        {/* turn indicator */}
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          <div className="text-sm text-zinc-500">ตาปัจจุบัน</div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {room.players.find((p) => p.id === room.currentTurnId)?.name ?? "—"}
            {isMyTurn && (
              <span className="ml-2 text-sm font-normal text-indigo-500">
                (ตาคุณ!)
              </span>
            )}
          </div>
        </div>

        {/* scores */}
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            คะแนนรวม · รอบ {room.round}
          </div>
          <div className="space-y-1">
            {[...room.players]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span
                    className={
                      p.guessedCorrectly
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : p.guessedThisRound
                        ? "text-zinc-400 line-through"
                        : "text-zinc-800 dark:text-zinc-200"
                    }
                  >
                    {p.name}
                    {p.id === playerId && " (คุณ)"}
                  </span>
                  <span className="font-mono text-zinc-600 dark:text-zinc-400">
                    {p.score}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* actions */}
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          {!canAct ? (
            <p className="text-center text-sm text-zinc-500">
              {me?.guessedCorrectly
                ? "✓ คุณทายถูกแล้ว รอจบรอบ"
                : "คุณทายไปแล้วในรอบนี้ รอจบรอบ"}
            </p>
          ) : isMyTurn ? (
            <>
              <div className="mb-3 grid grid-cols-2 gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <button
                  onClick={() => setMode("ask")}
                  className={`py-1.5 rounded text-sm font-medium ${
                    mode === "ask"
                      ? "bg-white text-indigo-600 dark:bg-zinc-950 dark:text-indigo-400"
                      : "text-zinc-500"
                  }`}
                >
                  ถาม
                </button>
                <button
                  onClick={() => setMode("guess")}
                  className={`py-1.5 rounded text-sm font-medium ${
                    mode === "guess"
                      ? "bg-white text-indigo-600 dark:bg-zinc-950 dark:text-indigo-400"
                      : "text-zinc-500"
                  }`}
                >
                  ทาย (เสี่ยง!)
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    mode === "ask"
                      ? "พิมพ์คำถาม yes/no..."
                      : "ทายว่าคุณคือใคร..."
                  }
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                    mode === "guess"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {mode === "guess" ? "ทาย!" : "ส่ง"}
                </button>
              </form>
              {mode === "guess" && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠ ถ้าทาย จะหมดสิทธิ์ถามในรอบนี้ทันที
                </p>
              )}
            </>
          ) : room.currentTurnId ? (
            <div>
              <p className="text-sm text-zinc-500 mb-2">
                ตอบคำถาม yes/no ให้ผู้ถามได้
              </p>
              <div className="flex gap-2">
                {(["yes", "no", "maybe"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => handleAnswer(v)}
                    disabled={loading}
                    className="flex-1 rounded-lg py-2 text-sm font-medium transition disabled:opacity-50 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {v === "yes" ? "ใช่" : v === "no" ? "ไม่ใช่" : "อาจจะ"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* chat */}
      <ChatPanel chat={room.chat} players={room.players} chatEndRef={chatEndRef} />
    </div>
  );
}

function ChatPanel({
  chat,
  chatEndRef,
}: {
  chat: ChatMessage[];
  players: PublicRoomState["players"];
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900 h-[400px] md:h-auto md:max-h-[600px] flex flex-col">
      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        ห้องแชต์
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {chat.map((m) => (
          <div
            key={m.id}
            className={`text-sm rounded-lg px-2.5 py-1.5 ${
              m.type === "system"
                ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                : m.type === "question"
                ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200"
                : m.type === "answer"
                ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                : m.correct
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
            }`}
          >
            <span className="font-medium">{m.fromName}: </span>
            <span>
              {m.type === "question"
                ? `❓ ${m.text}`
                : m.type === "guess"
                ? `🎯 ${m.text}`
                : m.text}
            </span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
