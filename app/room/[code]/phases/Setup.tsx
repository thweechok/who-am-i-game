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
  const amHost = room.hostId === playerId;
  const [tab, setTab] = useState<"manual" | "ai">("manual");
  const [topic, setTopic] = useState("ดารา");
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [answerInput, setAnswerInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiNote, setAiNote] = useState("");

  const others = room.players.filter((p) => p.id !== playerId);
  const needAnswer = room.players.filter((p) => !room.answers[p.id]);
  const readyCount = room.players.length - needAnswer.length;
  const progressPct = Math.round((readyCount / room.players.length) * 100);

  async function handleManual(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedTarget) { setError("เลือกผู้เล่นที่จะตั้งคำตอบให้"); return; }
    if (!answerInput.trim()) { setError("พิมพ์คำตอบ"); return; }
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
    setError(""); setAiNote("");
    setLoading(true);
    try {
      const res = await setupAI(room.code, playerId, topic);
      setAiNote(
        res.source === "ai"
          ? `✨ AI สุ่มให้ ${res.assigned} คนแล้ว`
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
    setLoading(true); setError("");
    try {
      await startGame(room.code, playerId, "playing");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0.6rem",
    color: "#e2e8f0",
    width: "100%",
    padding: "0.6rem 0.875rem",
    fontSize: "0.875rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "#6366f1";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.2)";
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
    e.currentTarget.style.boxShadow = "none";
  }

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
        <h2 className="text-lg font-bold text-slate-100">เตรียมเกม</h2>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          ตั้งคำตอบให้ผู้เล่นคนอื่น — แต่ละคนต้องมีคำตอบ 1 อย่าง
        </p>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-500">ความคืบหน้า</span>
            <span className="font-semibold text-slate-300">
              {readyCount}/{room.players.length} คน
            </span>
          </div>
          <div
            className="relative h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: progressPct === 100
                  ? "linear-gradient(90deg, #34d399, #10b981)"
                  : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                boxShadow: progressPct === 100
                  ? "0 0 10px rgba(52,211,153,0.5)"
                  : "0 0 10px rgba(99,102,241,0.5)",
              }}
            />
          </div>
          {needAnswer.length > 0 && (
            <p className="mt-2 text-xs text-slate-600">
              ยังขาด: {needAnswer.map((p) => p.name).join(", ")}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-5"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          {(["manual", "ai"] as const).map((t) => (
            <button
              key={t}
              id={`tab-setup-${t}`}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
              style={
                tab === t
                  ? {
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      color: "#fff",
                      boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
                    }
                  : { color: "#64748b" }
              }
            >
              {t === "manual" ? "✏️ ตั้งเอง" : "✨ สุ่ม AI"}
            </button>
          ))}
        </div>

        {/* Manual */}
        {tab === "manual" ? (
          <form onSubmit={handleManual} className="space-y-3 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                ตั้งให้ใคร
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              >
                <option value="" style={{ background: "#0e1022" }}>— เลือกผู้เล่น —</option>
                {others.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: "#0e1022" }}>
                    {p.name}
                    {room.answers[p.id] ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                คำตอบ (บุคคล/ตัวละคร/สิ่งของ)
              </label>
              <input
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                maxLength={60}
                placeholder="เช่น อัลเบิร์ต ไอน์สไตน์"
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
              }}
            >
              {loading ? "กำลังบันทึก..." : "💾 ตั้งคำตอบ"}
            </button>
          </form>
        ) : (
          <div className="space-y-3 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                หัวข้อ
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TOPIC_SUGGESTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-150"
                    style={
                      topic === t
                        ? { background: "rgba(99,102,241,0.25)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.4)" }
                        : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button
              id="btn-ai-assign"
              onClick={handleAI}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                boxShadow: "0 4px 16px rgba(139,92,246,0.35)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  กำลังสุ่ม...
                </span>
              ) : "✨ สุ่มคำตอบให้ทุกคนที่ยังไม่มี"}
            </button>
            {aiNote && (
              <div
                className="rounded-xl px-3 py-2.5 text-xs font-medium animate-fade-in"
                style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}
              >
                {aiNote}
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            className="mt-3 rounded-xl px-3 py-2.5 text-sm animate-fade-in"
            style={{ background: "rgba(251,113,133,0.1)", color: "#fb7185" }}
          >
            {error}
          </div>
        )}

        {amHost && (
          <button
            id="btn-start-playing"
            onClick={handleStartPlaying}
            disabled={loading || needAnswer.length > 0}
            className="mt-5 w-full py-3.5 rounded-xl font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={
              needAnswer.length === 0
                ? {
                    background: "linear-gradient(135deg, #10b981, #34d399)",
                    boxShadow: "0 8px 24px rgba(16,185,129,0.4)",
                  }
                : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }
            }
            onMouseEnter={(e) => {
              if (needAnswer.length === 0) e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          >
            {needAnswer.length > 0
              ? `⏳ รอคำตอบครบ (${needAnswer.length} คน)`
              : "🚀 เริ่มเล่น!"}
          </button>
        )}
      </div>
    </div>
  );
}
