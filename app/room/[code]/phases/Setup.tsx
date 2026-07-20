"use client";

import { useState } from "react";
import type { PublicRoomState } from "@/lib/types";
import { setupManual, setupAI, startGame } from "@/lib/api-client";

type Difficulty = "easy" | "medium" | "hard";

// ─── Preset topic categories ─────────────────────────────────────────────────
const TOPIC_PRESETS = [
  { emoji: "⚽", label: "นักฟุตบอล",         value: "นักฟุตบอลชื่อดังระดับโลก เช่น Messi, Ronaldo, Mbappe, Neymar", group: "กีฬา" },
  { emoji: "🏆", label: "ทีมฟุตบอล",         value: "ทีมฟุตบอลชื่อดังทั่วโลก เช่น Real Madrid, Barcelona, Manchester United, Liverpool, Bayern Munich", group: "กีฬา" },
  { emoji: "🏀", label: "นักบาสเกตบอล",      value: "นักบาสเกตบอล NBA ชื่อดัง เช่น LeBron James, Michael Jordan, Stephen Curry", group: "กีฬา" },
  { emoji: "🎾", label: "นักเทนนิส",         value: "นักเทนนิสชื่อดัง เช่น Federer, Nadal, Djokovic, Serena Williams", group: "กีฬา" },
  { emoji: "🥊", label: "นักมวย/ต่อสู้",     value: "นักมวยและนักต่อสู้ชื่อดัง เช่น Muhammad Ali, Buakaw, Saenchai, Tyson Fury", group: "กีฬา" },
  { emoji: "🏊", label: "นักกีฬาโอลิมปิก",  value: "นักกีฬาโอลิมปิกชื่อดัง เช่น Usain Bolt, Michael Phelps, Simone Biles", group: "กีฬา" },
  { emoji: "🍜", label: "อาหารไทย",          value: "อาหารไทยชื่อดัง เช่น ผัดไทย ต้มยำกุ้ง ข้าวผัด ส้มตำ แกงมัสสมั่น ข้าวมันไก่", group: "อาหาร" },
  { emoji: "🍕", label: "อาหารโลก",          value: "อาหารชื่อดังจากทั่วโลก เช่น Pizza, Sushi, Burger, Pasta, Tacos, Croissant", group: "อาหาร" },
  { emoji: "🍣", label: "อาหารญี่ปุ่น",      value: "อาหารญี่ปุ่น เช่น Sushi, Ramen, Tempura, Udon, Takoyaki, Miso Soup", group: "อาหาร" },
  { emoji: "🧁", label: "ของหวาน/ขนม",       value: "ของหวานและขนมชื่อดัง เช่น Tiramisu, Cheesecake, Macaron, Donut, Ice cream", group: "อาหาร" },
  { emoji: "🍹", label: "เครื่องดื่ม",       value: "เครื่องดื่มชื่อดัง เช่น Coca-Cola, Starbucks Latte, Bubble Tea, Espresso, Sprite", group: "อาหาร" },
  { emoji: "🦁", label: "สัตว์ป่า",          value: "สัตว์ป่าชนิดต่างๆ เช่น สิงโต เสือ ช้าง ยีราฟ หมี กอริลลา", group: "สัตว์" },
  { emoji: "🌊", label: "สัตว์ทะเล",         value: "สัตว์ทะเลชนิดต่างๆ เช่น ฉลาม วาฬ ปลาโลมา ปลาหมึก กุ้ง ปู", group: "สัตว์" },
  { emoji: "🐦", label: "นก",                value: "นกชนิดต่างๆ เช่น นกอินทรี นกฟลามิงโก้ นกแก้ว เพนกวิน นกฮูก", group: "สัตว์" },
  { emoji: "🐕", label: "สัตว์เลี้ยง",       value: "สายพันธุ์สัตว์เลี้ยงชนิดต่างๆ เช่น โกลเด้น ปอมเมอเรเนียน เปอร์เซีย เมนคูน", group: "สัตว์" },
  { emoji: "🎬", label: "ดาราฮอลลีวูด",     value: "ดาราฮอลลีวูดชื่อดัง", group: "บันเทิง" },
  { emoji: "🎭", label: "ดาราไทย",           value: "ดาราและนักแสดงไทยชื่อดัง", group: "บันเทิง" },
  { emoji: "📺", label: "ดาราเกาหลี",        value: "ดาราเกาหลี K-pop K-drama ชื่อดัง", group: "บันเทิง" },
  { emoji: "🎵", label: "ศิลปิน/นักร้อง",    value: "ศิลปินนักร้องชื่อดังระดับโลก", group: "บันเทิง" },
  { emoji: "⛩️", label: "อนิเมะ",            value: "ตัวละครอนิเมะชื่อดัง เช่น Naruto, Luffy, Goku, Sakura, Eren, Nezuko", group: "บันเทิง" },
  { emoji: "🦸", label: "มาร์เวล/DC",        value: "ซุปเปอร์ฮีโร่ เช่น Spider-Man, Batman, Wonder Woman, Iron Man, Thor, Black Panther", group: "บันเทิง" },
  { emoji: "🐭", label: "ดิสนีย์/พิกซาร์",  value: "ตัวละครดิสนีย์และพิกซาร์ เช่น Mickey, Elsa, Simba, Moana, Woody, Buzz", group: "บันเทิง" },
  { emoji: "👾", label: "ตัวละครเกม",        value: "ตัวละครในวิดีโอเกมชื่อดัง เช่น Mario, Pikachu, Master Chief, Link, Lara Croft", group: "บันเทิง" },
  { emoji: "🌶️", label: "ตัวร้าย",          value: "ตัวร้ายชื่อดัง เช่น Joker, Thanos, Voldemort, Darth Vader, Maleficent", group: "บันเทิง" },
  { emoji: "🧙", label: "แฟนตาซี",           value: "ตัวละครแฟนตาซี เช่น Harry Potter, Gandalf, Frodo, Dumbledore, Merlin", group: "บันเทิง" },
  { emoji: "🌍", label: "ประเทศ",            value: "ประเทศต่างๆ ทั่วโลก", group: "โลก" },
  { emoji: "🏙️", label: "เมืองสำคัญ",       value: "เมืองและนครสำคัญทั่วโลก เช่น Tokyo, Paris, New York, Bangkok, Dubai, London", group: "โลก" },
  { emoji: "🗺️", label: "สถานที่ท่องเที่ยว", value: "สถานที่ท่องเที่ยวชื่อดัง เช่น Eiffel Tower, Great Wall, Colosseum, Niagara Falls", group: "โลก" },
  { emoji: "👑", label: "ผู้นำโลก",          value: "ผู้นำประเทศและประธานาธิบดีชื่อดัง", group: "บุคคล" },
  { emoji: "🔬", label: "นักวิทยาศาสตร์",    value: "นักวิทยาศาสตร์ผู้ยิ่งใหญ่ เช่น Einstein, Newton, Curie, Darwin, Tesla", group: "บุคคล" },
  { emoji: "⚔️", label: "ประวัติศาสตร์",     value: "บุคคลประวัติศาสตร์โลก ทั้งไทยและต่างประเทศ", group: "บุคคล" },
  { emoji: "🚗", label: "แบรนด์รถยนต์",      value: "แบรนด์รถยนต์ชื่อดัง เช่น Ferrari, BMW, Toyota, Tesla, Lamborghini, Rolls-Royce", group: "สิ่งของ" },
  { emoji: "✈️", label: "พาหนะ",             value: "พาหนะชนิดต่างๆ ทางบก ทางน้ำ ทางอากาศ", group: "สิ่งของ" },
  { emoji: "📱", label: "แบรนด์/บริษัท",     value: "แบรนด์และบริษัทชื่อดัง เช่น Apple, Google, Nike, LEGO, Coca-Cola, Samsung", group: "สิ่งของ" },
  { emoji: "👨‍🍳", label: "อาชีพ",           value: "อาชีพต่างๆ", group: "สิ่งของ" },
];

const GROUPS = ["กีฬา", "อาหาร", "สัตว์", "บันเทิง", "โลก", "บุคคล", "สิ่งของ"];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string; color: string; bg: string; border: string }[] = [
  { value: "easy",   label: "🟢 ง่าย",   desc: "ทุกคนรู้จัก",  color: "#34d399", bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.3)"   },
  { value: "medium", label: "🟡 กลาง",   desc: "คิดนิดหน่อย",  color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)"   },
  { value: "hard",   label: "🔴 ยาก",    desc: "ต้องรู้เยอะ",  color: "#fb7185", bg: "rgba(251,113,133,0.1)", border: "rgba(251,113,133,0.3)"  },
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
  const [activeGroup, setActiveGroup]     = useState<string>("กีฬา");

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [aiNote, setAiNote]     = useState("");

  const others    = room.players.filter((p) => p.id !== playerId && !p.isSpectator);
  const needAnswer = room.players.filter((p) => !p.isSpectator && !room.answers[p.id]);
  const readyCount = room.players.filter(p => !p.isSpectator).length - needAnswer.length;
  const totalPlayers = room.players.filter(p => !p.isSpectator).length;
  const progressPct = totalPlayers > 0 ? Math.round((readyCount / totalPlayers) * 100) : 0;

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
    if (!effectiveTopic) { setError("เลือกหรือพิมพ์หัวข้อ"); return; }
    setLoading(true);
    setError("");
    setAiNote("");
    try {
      const res = await setupAI(room.code, playerId, effectiveTopic, difficulty);
      setAiNote(res?.source ?? "สุ่มเรียบร้อย!");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleBeginGame() {
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

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1rem",
  };

  const filteredTopics = TOPIC_PRESETS.filter(t => t.group === activeGroup);
  const currentTopicLabel = TOPIC_PRESETS.find(t => t.value === selectedTopic)?.label ?? "กำหนดเอง";

  return (
    <div className="w-full max-w-xl animate-slide-up space-y-4">
      {/* Progress */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-slate-400">ความพร้อม</span>
          <span className="text-xs font-black text-slate-300">{readyCount}/{totalPlayers} คน</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: progressPct === 100 ? "#34d399" : "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
        </div>
        {room.answers[playerId] && (
          <p className="text-[10px] text-slate-500 mt-2">✅ คุณตั้งคำตอบให้คนอื่นแล้ว</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {(["manual", "ai"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
            style={tab === t
              ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }
              : { background: "transparent", color: "#475569" }}>
            {t === "manual" ? "✏️ ตั้งเอง" : "✨ สุ่ม AI"}
          </button>
        ))}
      </div>

      {/* ── Manual tab ── */}
      {tab === "manual" && (
        <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
          <p className="text-xs text-slate-500">ตั้งชื่อให้ผู้เล่นคนอื่น — แต่ละคนตั้งได้คนละ 1 คน</p>
          <form onSubmit={handleManual} className="space-y-3">
            {/* Target selector */}
            <div className="grid grid-cols-2 gap-2">
              {others.map((p) => {
                const hasAnswer = !!room.answers[p.id];
                const isSelected = selectedTarget === p.id;
                return (
                  <button key={p.id} type="button" onClick={() => !hasAnswer && setSelectedTarget(p.id)}
                    disabled={hasAnswer}
                    className="p-3 rounded-xl text-sm font-bold text-left transition-all duration-150"
                    style={isSelected
                      ? { background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.5)", color: "#a5b4fc" }
                      : hasAnswer
                        ? { background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399", cursor: "default" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                    {hasAnswer ? "✅ " : ""}{p.name}
                  </button>
                );
              })}
            </div>
            {others.length === 0 && (
              <p className="text-xs text-slate-600 text-center py-2">ไม่มีผู้เล่นอื่น</p>
            )}
            {selectedTarget && (
              <div className="space-y-2">
                <input
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder={`ชื่อตัวละครให้ ${others.find(p => p.id === selectedTarget)?.name}...`}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white placeholder-slate-600 outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  maxLength={50}
                />
                <button type="submit" disabled={loading || !answerInput.trim()}
                  className="w-full py-3 rounded-xl text-sm font-black text-white transition-all"
                  style={{ background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", opacity: (!answerInput.trim()) ? 0.4 : 1 }}>
                  {loading ? "กำลังบันทึก..." : "✅ บันทึก"}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ── AI tab ── */}
      {tab === "ai" && (
        <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
          {amHost ? (
            <>
              {/* Host-only: group filter */}
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">เลือกหมวดหมู่</p>
                <div className="flex flex-wrap gap-1.5">
                  {GROUPS.map(g => (
                    <button key={g} onClick={() => setActiveGroup(g)}
                      className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                      style={activeGroup === g
                        ? { background: "rgba(99,102,241,0.25)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.4)" }
                        : { background: "rgba(255,255,255,0.05)", color: "#475569", border: "1px solid rgba(255,255,255,0.07)" }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic grid */}
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">เลือกหัวข้อ</p>
                <div className="grid grid-cols-3 gap-2">
                  {filteredTopics.map((topic) => {
                    const isActive = !useCustom && selectedTopic === topic.value;
                    return (
                      <button key={topic.value} onClick={() => { setSelectedTopic(topic.value); setUseCustom(false); }}
                        className="p-2.5 rounded-xl flex flex-col items-center gap-1 text-center transition-all duration-150"
                        style={isActive
                          ? { background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.5)" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <span className="text-xl">{topic.emoji}</span>
                        <span className="text-[10px] font-bold leading-tight" style={{ color: isActive ? "#a5b4fc" : "#64748b" }}>{topic.label}</span>
                      </button>
                    );
                  })}
                  {/* Custom tile */}
                  <button onClick={() => setUseCustom(true)}
                    className="p-2.5 rounded-xl flex flex-col items-center gap-1 text-center transition-all duration-150"
                    style={useCustom
                      ? { background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.5)" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)" }}>
                    <span className="text-xl">✏️</span>
                    <span className="text-[10px] font-bold leading-tight" style={{ color: useCustom ? "#a5b4fc" : "#64748b" }}>กำหนดเอง</span>
                  </button>
                </div>
                {useCustom && (
                  <input value={customTopic} onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="เช่น นักร้องไทยยุค 90..." autoFocus
                    className="mt-2 w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(99,102,241,0.4)" }}
                    maxLength={80} />
                )}
              </div>

              {/* Difficulty */}
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">ระดับความยาก</p>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setDifficulty(opt.value)}
                      className="py-2.5 px-2 rounded-xl text-xs font-bold text-center transition-all duration-150"
                      style={difficulty === opt.value
                        ? { background: opt.bg, border: `1px solid ${opt.border}`, color: opt.color }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#475569" }}>
                      {opt.label}
                      <div className="text-[9px] mt-0.5 opacity-70">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI button */}
              {aiNote && (
                <div className="rounded-xl px-4 py-2.5 text-sm text-center font-semibold"
                  style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>
                  ✅ {aiNote}
                </div>
              )}
              <button onClick={handleAI} disabled={loading || !effectiveTopic}
                className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition-all"
                style={{ background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  boxShadow: "0 8px 24px rgba(99,102,241,0.3)", opacity: !effectiveTopic ? 0.5 : 1 }}>
                {loading ? "🤖 AI กำลังสุ่ม..." : "✨ สุ่มคำตอบให้ทุกคนทีเดียว"}
              </button>
            </>
          ) : (
            /* Non-host: read-only view */
            <div className="text-center py-6 space-y-3">
              <div className="text-4xl mb-2">👀</div>
              <p className="text-sm font-bold text-slate-300">รอ Host เลือกหัวข้อ</p>
              <p className="text-xs text-slate-600">เฉพาะ Host เท่านั้นที่เลือกหัวข้อและสุ่มคำตอบได้</p>
              {room.topic && (
                <div className="mt-3 rounded-xl px-4 py-3 inline-block"
                  style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <p className="text-xs text-slate-500 mb-1">หัวข้อที่เลือก</p>
                  <p className="text-sm font-bold text-indigo-300">{room.topic}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "rgba(251,113,133,0.1)", color: "#fb7185", border: "1px solid rgba(251,113,133,0.2)" }}>
          {error}
        </div>
      )}

      {/* Begin Game (host only, when all ready) */}
      {amHost && (
        <div className="rounded-2xl p-4" style={cardStyle}>
          {needAnswer.length > 0 ? (
            <p className="text-xs text-slate-500 text-center">
              ⏳ รอ {needAnswer.map(p => p.name).join(", ")} ตั้งคำตอบ ({readyCount}/{totalPlayers})
            </p>
          ) : (
            <button onClick={handleBeginGame} disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all duration-200"
              style={{ background: "linear-gradient(135deg,#34d399,#059669)", boxShadow: "0 8px 32px rgba(52,211,153,0.35)" }}>
              🚀 เริ่มเล่น!
            </button>
          )}
        </div>
      )}
      {!amHost && needAnswer.length === 0 && (
        <div className="rounded-2xl p-4 text-center" style={cardStyle}>
          <p className="text-sm font-bold text-slate-400">✅ ทุกคนพร้อมแล้ว — รอ Host กด เริ่มเล่น</p>
        </div>
      )}
    </div>
  );
}
