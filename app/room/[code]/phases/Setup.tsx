"use client";

import { useState } from "react";
import type { PublicRoomState } from "@/lib/types";
import type { Difficulty } from "@/lib/openai";
import { setupManual, setupAI, startGame } from "@/lib/api-client";

// ─── Preset topic categories ───────────────────────────────────────────────
const TOPIC_PRESETS = [
  { emoji: "🎬", label: "ดาราฮอลลีวูด",    value: "ดาราฮอลลีวูด" },
  { emoji: "🎵", label: "ศิลปิน/นักร้อง",  value: "ศิลปิน นักร้อง" },
  { emoji: "🎭", label: "ดาราไทย",          value: "ดาราไทย" },
  { emoji: "📺", label: "ซีรีส์เกาหลี",    value: "ดาราเกาหลี K-drama" },
  { emoji: "🦸", label: "มาร์เวล/DC",      value: "ซุปเปอร์ฮีโร่ มาร์เวล DC" },
  { emoji: "⛩️", label: "อนิเมะ",           value: "ตัวละครอนิเมะ" },
  { emoji: "🐭", label: "ดิสนีย์",          value: "ตัวละครดิสนีย์" },
  { emoji: "👾", label: "ตัวละครเกม",       value: "ตัวละครในวิดีโอเกม" },
  { emoji: "🔬", label: "นักวิทยาศาสตร์",  value: "นักวิทยาศาสตร์ผู้ยิ่งใหญ่" },
  { emoji: "👑", label: "ผู้นำโลก",         value: "ผู้นำประเทศ ประธานาธิบดี" },
  { emoji: "⚔️", label: "บุคคลไทย",        value: "บุคคลประวัติศาสตร์ไทย" },
  { emoji: "🌍", label: "ประวัติศาสตร์",   value: "บุคคลประวัติศาสตร์โลก" },
  { emoji: "🦁", label: "สัตว์ป่า",         value: "สัตว์ป่า" },
  { emoji: "🌊", label: "สัตว์ทะเล",        value: "สัตว์ทะเล" },
  { emoji: "⚽", label: "นักฟุตบอล",        value: "นักฟุตบอลชื่อดัง" },
  { emoji: "🧙", label: "แฟนตาซี",          value: "ตัวละครแฟนตาซี เวทมนตร์" },
  { emoji: "🌶️", label: "ตัวร้าย",         value: "ตัวร้ายในภาพยนตร์และการ์ตูน" },
  { emoji: "👨‍🍳", label: "อาชีพ",          value: "อาชีพต่างๆ" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string; color: string; bg: string; border: string }[] = [
  { value: "easy",   label: "🟢 ง่าย",   desc: "ทุกคนรู้จัก", color: "#34d399", bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.3)"   },
  { value: "medium", label: "🟡 กลาง",  desc: "คิดนิดหน่อย",  color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)"   },
  { value: "hard",   label: "🔴 ยาก",   desc: "ต้องรู้เยอะ",  color: "#fb7185", bg: "rgba(251,113,133,0.1)", border: "rgba(251,113,133,0.3)"  },
];

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

  // Manual
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [answerInput, setAnswerInput] = useState("");

  // AI
  const [selectedTopic, setSelectedTopic] = useState<string>(TOPIC_PRESETS[0].value);
  const [customTopic, setCustomTopic]     = useState<string>("");
  const [useCustom, setUseCustom]         = useState(false);
  const [difficulty, setDifficulty]       = useState<Difficulty>("medium");

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [aiNote, setAiNote]     = useState("");

  const others    = room.players.filter((p) => p.id !== playerId);
  const needAnswer = room.players.filter((p) => !room.answers[p.id]);
  const readyCount = room.players.length - needAnswer.length;
  const progressPct = Math.round((readyCount / room.players.length) * 100);

  const effectiveTopic = useCustom ? customTopic.trim() : selectedTopic;

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
    if (!effectiveTopic) { setError("เลือกหรือพิมพ์หัวข้อก่อน"); return; }
    setLoading(true);
    try {
      const res = await setupAI(room.code, playerId, effectiveTopic, difficulty);
      const src = res.source === "openai" ? "ChatGPT" : res.source === "gemini" ? "Gemini" : "รายการสำรอง";
      setAiNote(`✨ ${src} สุ่มให้ ${res.assigned} คนแล้ว`);
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
  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "#6366f1";
    e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(99,102,241,0.2)";
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
    e.currentTarget.style.boxShadow   = "none";
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

        {/* Progress */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-500">ความคืบหน้า</span>
            <span className="font-semibold text-slate-300">{readyCount}/{room.players.length} คน</span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: progressPct === 100 ? "linear-gradient(90deg,#34d399,#10b981)" : "linear-gradient(90deg,#6366f1,#8b5cf6)",
                boxShadow:  progressPct === 100 ? "0 0 10px rgba(52,211,153,0.5)"           : "0 0 10px rgba(99,102,241,0.5)",
              }}
            />
          </div>
          {needAnswer.length > 0 && (
            <p className="mt-2 text-xs text-slate-600">ยังขาด: {needAnswer.map((p) => p.name).join(", ")}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.04)" }}>
          {(["manual","ai"] as const).map((t) => (
            <button
              key={t}
              id={`tab-setup-${t}`}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
              style={
                tab === t
                  ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }
                  : { color: "#64748b" }
              }
            >
              {t === "manual" ? "✏️ ตั้งเอง" : "✨ สุ่ม AI"}
            </button>
          ))}
        </div>

        {/* ── Manual tab ── */}
        {tab === "manual" ? (
          <form onSubmit={handleManual} className="space-y-3 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ตั้งให้ใคร</label>
              <select value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="" style={{ background: "#0e1022" }}>— เลือกผู้เล่น —</option>
                {others.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: "#0e1022" }}>
                    {p.name}{room.answers[p.id] ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">คำตอบ</label>
              <input
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                maxLength={60}
                placeholder="เช่น อัลเบิร์ต ไอน์สไตน์"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all duration-200"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}
            >
              {loading ? "กำลังบันทึก..." : "💾 ตั้งคำตอบ"}
            </button>
          </form>

        ) : (
          /* ── AI tab ── */
          <div className="space-y-4 animate-fade-in">

            {/* Topic grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                เลือกหัวข้อ
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {TOPIC_PRESETS.map((t) => {
                  const isActive = !useCustom && selectedTopic === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { setUseCustom(false); setSelectedTopic(t.value); }}
                      className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-center transition-all duration-150"
                      style={
                        isActive
                          ? { background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.5)", color: "#818cf8" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }
                      }
                    >
                      <span className="text-lg leading-none">{t.emoji}</span>
                      <span className="text-[10px] font-medium leading-tight">{t.label}</span>
                    </button>
                  );
                })}
                {/* Custom topic tile */}
                <button
                  type="button"
                  onClick={() => setUseCustom(true)}
                  className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-center transition-all duration-150"
                  style={
                    useCustom
                      ? { background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.4)", color: "#38bdf8" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)", color: "#475569" }
                  }
                >
                  <span className="text-lg leading-none">✏️</span>
                  <span className="text-[10px] font-medium leading-tight">กำหนดเอง</span>
                </button>
              </div>

              {/* Custom input */}
              {useCustom && (
                <div className="mt-3 animate-slide-up">
                  <input
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    maxLength={60}
                    placeholder="เช่น นักดนตรีแจ๊ส, ตัวละคร One Piece..."
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#38bdf8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(56,189,248,0.15)"; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                    autoFocus
                  />
                </div>
              )}

              {/* Selected topic preview */}
              {!useCustom && (
                <p className="mt-2 text-xs text-slate-600 text-center">
                  หัวข้อ: <span className="text-slate-400 font-medium">{TOPIC_PRESETS.find(t => t.value === selectedTopic)?.emoji} {TOPIC_PRESETS.find(t => t.value === selectedTopic)?.label}</span>
                </p>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                ระดับความยาก
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    id={`btn-difficulty-${d.value}`}
                    onClick={() => setDifficulty(d.value)}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-center transition-all duration-150"
                    style={
                      difficulty === d.value
                        ? { background: d.bg, border: `1px solid ${d.border}`, color: d.color, boxShadow: `0 4px 12px ${d.bg}` }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#475569" }
                    }
                  >
                    <span className="text-sm font-bold">{d.label}</span>
                    <span className="text-[10px]" style={{ color: difficulty === d.value ? d.color : "#374151" }}>{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              id="btn-ai-assign"
              onClick={handleAI}
              disabled={loading || (!effectiveTopic)}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all duration-200"
              style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)", boxShadow: "0 4px 16px rgba(139,92,246,0.35)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  กำลังสุ่ม...
                </span>
              ) : "✨ สุ่มคำตอบให้ทุกคนที่ยังไม่มี"}
            </button>

            {aiNote && (
              <div className="rounded-xl px-3 py-2.5 text-xs font-medium animate-fade-in"
                style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>
                {aiNote}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl px-3 py-2.5 text-sm animate-fade-in"
            style={{ background: "rgba(251,113,133,0.1)", color: "#fb7185" }}>
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
                ? { background: "linear-gradient(135deg,#10b981,#34d399)", boxShadow: "0 8px 24px rgba(16,185,129,0.4)" }
                : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }
            }
            onMouseEnter={(e) => { if (!needAnswer.length) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          >
            {needAnswer.length > 0 ? `⏳ รอคำตอบครบ (${needAnswer.length} คน)` : "🚀 เริ่มเล่น!"}
          </button>
        )}
      </div>
    </div>
  );
}
