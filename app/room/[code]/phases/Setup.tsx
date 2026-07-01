"use client";

import { useState } from "react";
import type { PublicRoomState } from "@/lib/types";
import { setupManual, setupAI, startGame } from "@/lib/api-client";

const TOPIC_SUGGESTIONS = ["ดารา", "การ์ตูน", "ประวัติศาสตร์", "สัตว์", "ทั่วไป"];

export function Setup({
  room,
  playerId,
  onRefresh,
}: {
  room: PublicRoomState;
  playerId: string;
  onRefresh: () => void;
}) {
  const isHost = room.hostId === playerId;
  const [tab, setTab] = useState<"manual" | "ai">("manual");
  const [topic, setTopic] = useState("ดารา");
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [answerInput, setAnswerInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiNote, setAiNote] = useState("");

  const others = room.players.filter((p) => p.id !== playerId);
  const needAnswer = room.players.filter((p) => !room.answers[p.id]);

  async function handleManual(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedTarget) {
      setError("เลือกผู้เล่นที่จะตั้งคำตอบให้");
      return;
    }
    if (!answerInput.trim()) {
      setError("พิมพ์คำตอบ");
      return;
    }
    setLoading(true);
    try {
      await setupManual(room.code, playerId, selectedTarget, answerInput);
      setAnswerInput("");
      setSelectedTarget("");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAI() {
    setError("");
    setAiNote("");
    setLoading(true);
    try {
      const res = await setupAI(room.code, playerId, topic);
      setAiNote(
        res.source === "ai"
          ? `✓ AI สุ่มให้ ${res.assigned} คนแล้ว`
          : `✓ ใช้รายการสำรอง (AI ไม่พร้อมใช้งาน) — สุ่มให้ ${res.assigned} คน`
      );
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartPlaying() {
    setLoading(true);
    setError("");
    try {
      await startGame(room.code, playerId, "playing");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          เตรียมเกม
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          ตั้งคำตอบให้ผู้เล่นคนอื่น — แต่ละคนต้องมีคำตอบ 1 อย่าง
        </p>

        {/* progress */}
        <div className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/60">
          <span className="text-zinc-500">ตั้งคำตอบแล้ว:</span>{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {room.players.length - needAnswer.length}/{room.players.length}
          </span>
          {needAnswer.length > 0 && (
            <span className="ml-2 text-zinc-400">
              (ยังขาด: {needAnswer.map((p) => p.name).join(", ")})
            </span>
          )}
        </div>

        {/* tabs */}
        <div className="mt-5 grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <button
            onClick={() => setTab("manual")}
            className={`py-2 rounded-lg text-sm font-medium transition ${
              tab === "manual"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-950 dark:text-indigo-400"
                : "text-zinc-500"
            }`}
          >
            ตั้งเอง
          </button>
          <button
            onClick={() => setTab("ai")}
            className={`py-2 rounded-lg text-sm font-medium transition ${
              tab === "ai"
                ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-950 dark:text-indigo-400"
                : "text-zinc-500"
            }`}
          >
            สุ่ม AI
          </button>
        </div>

        {tab === "manual" ? (
          <form onSubmit={handleManual} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                ตั้งให้ใคร
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">— เลือกผู้เล่น —</option>
                {others.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {room.answers[p.id] ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                คำตอบ (บุคคล/ตัวละคร/สิ่งของ)
              </label>
              <input
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                maxLength={60}
                placeholder="เช่น อัลเบิร์ต ไอน์สไตน์"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "บันทึก..." : "ตั้งคำตอบ"}
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                หัวข้อ
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TOPIC_SUGGESTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleAI}
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "กำลังสุ่ม..." : "สุ่มคำตอบให้ทุกคนที่ยังไม่มี"}
            </button>
            {aiNote && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {aiNote}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {isHost && (
          <button
            onClick={handleStartPlaying}
            disabled={loading || needAnswer.length > 0}
            className="mt-5 w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-40"
          >
            {needAnswer.length > 0
              ? `รอคำตอบครบ (${needAnswer.length} คน)`
              : "เริ่มเล่น!"}
          </button>
        )}
      </div>
    </div>
  );
}
