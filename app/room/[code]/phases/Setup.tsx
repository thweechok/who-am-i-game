"use client";

import { useState } from "react";
import type { PublicRoomState } from "@/lib/types";
import { setupAI, startGame } from "@/lib/api-client";

type Difficulty = "easy" | "medium" | "hard";

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
  { emoji: "🧁", label: "ของหวาน/ขนม",       value: "ของหวานและขนมชื่อดัง เช่น Tiramisu, Cheesecake, Macaron, Donut", group: "อาหาร" },
  { emoji: "🍹", label: "เครื่องดื่ม",       value: "เครื่องดื่มชื่อดัง เช่น Coca-Cola, Starbucks, Bubble Tea, Espresso", group: "อาหาร" },
  { emoji: "🦁", label: "สัตว์ป่า",          value: "สัตว์ป่าชนิดต่างๆ เช่น สิงโต เสือ ช้าง ยีราฟ หมี กอริลลา", group: "สัตว์" },
  { emoji: "🌊", label: "สัตว์ทะเล",         value: "สัตว์ทะเลชนิดต่างๆ เช่น ฉลาม วาฬ ปลาโลมา ปลาหมึก", group: "สัตว์" },
  { emoji: "🐦", label: "นก",                value: "นกชนิดต่างๆ เช่น นกอินทรี นกฟลามิงโก้ นกแก้ว เพนกวิน นกฮูก", group: "สัตว์" },
  { emoji: "🐕", label: "สัตว์เลี้ยง",       value: "สายพันธุ์สัตว์เลี้ยงชนิดต่างๆ เช่น โกลเด้น ปอมเมอเรเนียน เปอร์เซีย เมนคูน", group: "สัตว์" },
  { emoji: "🎬", label: "ดาราฮอลลีวูด",     value: "ดาราฮอลลีวูดชื่อดัง", group: "บันเทิง" },
  { emoji: "🎭", label: "ดาราไทย",           value: "ดาราและนักแสดงไทยชื่อดัง", group: "บันเทิง" },
  { emoji: "📺", label: "ดาราเกาหลี",        value: "ดาราเกาหลี K-pop K-drama ชื่อดัง", group: "บันเทิง" },
  { emoji: "🎵", label: "ศิลปิน/นักร้อง",    value: "ศิลปินนักร้องชื่อดังระดับโลก", group: "บันเทิง" },
  { emoji: "⛩️", label: "อนิเมะ",            value: "ตัวละครอนิเมะชื่อดัง เช่น Naruto, Luffy, Goku, Sakura, Eren, Nezuko", group: "บันเทิง" },
  { emoji: "🦸", label: "มาร์เวล/DC",        value: "ซุปเปอร์ฮีโร่ เช่น Spider-Man, Batman, Wonder Woman, Iron Man, Thor", group: "บันเทิง" },
  { emoji: "🐭", label: "ดิสนีย์/พิกซาร์",  value: "ตัวละครดิสนีย์และพิกซาร์ เช่น Mickey, Elsa, Simba, Moana, Woody", group: "บันเทิง" },
  { emoji: "👾", label: "ตัวละครเกม",        value: "ตัวละครในวิดีโอเกมชื่อดัง เช่น Mario, Pikachu, Master Chief, Link", group: "บันเทิง" },
  { emoji: "🌶️", label: "ตัวร้าย",          value: "ตัวร้ายชื่อดัง เช่น Joker, Thanos, Voldemort, Darth Vader", group: "บันเทิง" },
  { emoji: "🧙", label: "แฟนตาซี",           value: "ตัวละครแฟนตาซี เช่น Harry Potter, Gandalf, Frodo, Dumbledore, Merlin", group: "บันเทิง" },
  { emoji: "🌍", label: "ประเทศ",            value: "ประเทศต่างๆ ทั่วโลก", group: "โลก" },
  { emoji: "🏙️", label: "เมืองสำคัญ",       value: "เมืองและนครสำคัญทั่วโลก เช่น Tokyo, Paris, New York, Bangkok, Dubai", group: "โลก" },
  { emoji: "🗺️", label: "สถานที่ท่องเที่ยว", value: "สถานที่ท่องเที่ยวชื่อดัง เช่น Eiffel Tower, Great Wall, Colosseum", group: "โลก" },
  { emoji: "👑", label: "ผู้นำโลก",          value: "ผู้นำประเทศและประธานาธิบดีชื่อดัง", group: "บุคคล" },
  { emoji: "🔬", label: "นักวิทยาศาสตร์",    value: "นักวิทยาศาสตร์ผู้ยิ่งใหญ่ เช่น Einstein, Newton, Curie, Darwin", group: "บุคคล" },
  { emoji: "⚔️", label: "ประวัติศาสตร์",     value: "บุคคลประวัติศาสตร์โลก ทั้งไทยและต่างประเทศ", group: "บุคคล" },
  { emoji: "🚗", label: "แบรนด์รถยนต์",      value: "แบรนด์รถยนต์ชื่อดัง เช่น Ferrari, BMW, Toyota, Tesla, Lamborghini", group: "สิ่งของ" },
  { emoji: "✈️", label: "พาหนะ",             value: "พาหนะชนิดต่างๆ ทางบก ทางน้ำ ทางอากาศ", group: "สิ่งของ" },
  { emoji: "📱", label: "แบรนด์/บริษัท",     value: "แบรนด์และบริษัทชื่อดัง เช่น Apple, Google, Nike, LEGO, Coca-Cola", group: "สิ่งของ" },
  { emoji: "👨‍🍳", label: "อาชีพ",           value: "อาชีพต่างๆ", group: "สิ่งของ" },
];

const GROUPS = ["กีฬา", "อาหาร", "สัตว์", "บันเทิง", "โลก", "บุคคล", "สิ่งของ"];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string }[] = [
  { value: "easy",   label: "🟢 ง่าย",  desc: "ทุกคนรู้จัก"  },
  { value: "medium", label: "🟡 กลาง", desc: "คิดนิดหน่อย" },
  { value: "hard",   label: "🔴 ยาก",  desc: "ต้องรู้เยอะ"  },
];

/* RPG frame style helpers */
const rpgCard = {
  background: "linear-gradient(180deg, #1c0e04 0%, #0d0700 60%, #1c0e04 100%)",
  border: "2px solid #9a6e10",
  boxShadow: "inset 0 1px 0 rgba(255,180,50,0.12), inset 0 -1px 0 rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(154,110,16,0.25)",
  borderRadius: "6px",
} as const;

const rpgBtn = {
  border: "2px solid #c8911a",
  outline: "1px solid #8b6010",
  outlineOffset: "-4px",
  borderRadius: "4px",
  background: "linear-gradient(180deg, #2a1800 0%, #1a0e00 50%, #2a1800 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,200,80,0.2), inset 0 -1px 0 rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.6)",
  color: "#f5d680",
} as const;

const rpgBtnPrimary = {
  border: "2px solid #d4a827",
  outline: "1px solid #a07820",
  outlineOffset: "-5px",
  borderRadius: "4px",
  background: "linear-gradient(180deg, #3a2200 0%, #1e1000 40%, #3a2200 100%)",
  boxShadow: "inset 0 2px 0 rgba(255,210,80,0.25), inset 0 -2px 0 rgba(0,0,0,0.5), 0 6px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,168,39,0.4), 0 0 20px rgba(212,168,39,0.15)",
  color: "#fde68a",
  textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(255,200,80,0.4)",
  letterSpacing: "0.05em",
} as const;

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

  const [selectedTopic, setSelectedTopic] = useState<string>(TOPIC_PRESETS[0].value);
  const [customTopic, setCustomTopic]     = useState<string>("");
  const [useCustom, setUseCustom]         = useState(false);
  const [difficulty, setDifficulty]       = useState<Difficulty>("medium");
  const [activeGroup, setActiveGroup]     = useState<string>("กีฬา");

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [aiDone, setAiDone]   = useState(false);

  const activePlayers  = room.players.filter(p => !p.isSpectator);
  const readyCount     = activePlayers.filter(p => room.answers[p.id]).length;
  const needAnswer     = activePlayers.filter(p => !room.answers[p.id]);
  const progressPct    = activePlayers.length > 0 ? Math.round((readyCount / activePlayers.length) * 100) : 0;
  const effectiveTopic = useCustom ? customTopic.trim() : selectedTopic;

  async function handleAI() {
    if (!effectiveTopic) { setError("เลือกหรือพิมพ์หัวข้อ"); return; }
    setLoading(true); setError(""); setAiDone(false);
    try {
      await setupAI(room.code, playerId, effectiveTopic, difficulty);
      setAiDone(true);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
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

  const filteredTopics = TOPIC_PRESETS.filter(t => t.group === activeGroup);

  return (
    <div className="w-full max-w-xl animate-slide-up space-y-3">

      {/* ── Progress bar ── */}
      <div className="p-4" style={rpgCard}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold" style={{ color: "#c8911a" }}>⚔️ ความพร้อม</span>
          <span className="text-xs font-black" style={{ color: "#f5d680" }}>{readyCount}/{activePlayers.length} คน</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid #5a3a08" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: progressPct === 100 ? "linear-gradient(90deg,#d4a827,#f5d680)" : "linear-gradient(90deg,#9a6e10,#c8911a)" }} />
        </div>
      </div>

      {/* ── AI Setup (Host only sees controls) ── */}
      <div className="p-5 space-y-4" style={rpgCard}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">✨</span>
          <span className="text-sm font-black" style={{ color: "#f5d680", textShadow: "0 0 8px rgba(255,200,80,0.3)" }}>
            สุ่มหัวข้อด้วย AI
          </span>
          {!amHost && <span className="ml-auto text-xs" style={{ color: "#9a6e10" }}>👁️ ดูเท่านั้น</span>}
        </div>

        {amHost ? (
          <>
            {/* Group filter */}
            <div>
              <p className="text-[10px] font-bold mb-2" style={{ color: "#9a6e10", letterSpacing: "0.08em" }}>หมวดหมู่</p>
              <div className="flex flex-wrap gap-1.5">
                {GROUPS.map(g => (
                  <button key={g} onClick={() => setActiveGroup(g)}
                    className="px-3 py-1 text-xs font-bold transition-all"
                    style={activeGroup === g ? {
                      ...rpgBtn,
                      padding: "4px 12px",
                      fontSize: "11px",
                    } : {
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid #4a2e08",
                      borderRadius: "4px",
                      color: "#6b4a1a",
                      padding: "4px 12px",
                      fontSize: "11px",
                    }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic grid */}
            <div>
              <p className="text-[10px] font-bold mb-2" style={{ color: "#9a6e10", letterSpacing: "0.08em" }}>เลือกหัวข้อ</p>
              <div className="grid grid-cols-3 gap-2">
                {filteredTopics.map((topic) => {
                  const isActive = !useCustom && selectedTopic === topic.value;
                  return (
                    <button key={topic.value}
                      onClick={() => { setSelectedTopic(topic.value); setUseCustom(false); }}
                      className="p-2.5 flex flex-col items-center gap-1 text-center transition-all duration-150"
                      style={isActive ? {
                        ...rpgBtn,
                        background: "linear-gradient(180deg, #3a2200 0%, #2a1600 50%, #3a2200 100%)",
                        border: "2px solid #d4a827",
                      } : {
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid #3a2208",
                        borderRadius: "4px",
                      }}>
                      <span className="text-xl">{topic.emoji}</span>
                      <span className="text-[10px] font-bold leading-tight"
                        style={{ color: isActive ? "#f5d680" : "#6b4a1a" }}>
                        {topic.label}
                      </span>
                    </button>
                  );
                })}
                <button onClick={() => setUseCustom(true)}
                  className="p-2.5 flex flex-col items-center gap-1 text-center transition-all"
                  style={useCustom ? {
                    ...rpgBtn,
                    background: "linear-gradient(180deg, #3a2200 0%, #2a1600 50%, #3a2200 100%)",
                    border: "2px solid #d4a827",
                  } : {
                    background: "rgba(0,0,0,0.3)",
                    border: "1px dashed #3a2208",
                    borderRadius: "4px",
                  }}>
                  <span className="text-xl">✏️</span>
                  <span className="text-[10px] font-bold" style={{ color: useCustom ? "#f5d680" : "#6b4a1a" }}>กำหนดเอง</span>
                </button>
              </div>
              {useCustom && (
                <input value={customTopic} onChange={e => setCustomTopic(e.target.value)}
                  placeholder="เช่น นักร้องไทยยุค 90..." autoFocus maxLength={80}
                  className="mt-2 w-full px-3 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(0,0,0,0.4)", border: "1px solid #c8911a", borderRadius: "4px", color: "#f5d680" }} />
              )}
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-[10px] font-bold mb-2" style={{ color: "#9a6e10", letterSpacing: "0.08em" }}>ระดับความยาก</p>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setDifficulty(opt.value)}
                    className="py-2.5 px-2 text-xs font-bold text-center transition-all"
                    style={difficulty === opt.value ? {
                      ...rpgBtn,
                      padding: "10px 8px",
                    } : {
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid #3a2208",
                      borderRadius: "4px",
                      color: "#6b4a1a",
                    }}>
                    {opt.label}
                    <div className="text-[9px] mt-0.5 opacity-60">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI button */}
            {aiDone && (
              <div className="px-4 py-2.5 text-sm text-center font-semibold rounded"
                style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>
                ✅ สุ่มคำตอบให้ทุกคนแล้ว!
              </div>
            )}
            <button onClick={handleAI} disabled={loading || !effectiveTopic}
              className="w-full py-4 text-sm font-black tracking-wider transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={rpgBtnPrimary}>
              {loading ? "🤖 AI กำลังสุ่ม..." : "✨ สุ่มคำตอบให้ทุกคน"}
            </button>
          </>
        ) : (
          /* Non-host: read-only */
          <div className="text-center py-6 space-y-3">
            <p className="text-sm font-bold" style={{ color: "#c8911a" }}>⏳ รอ Host เลือกหัวข้อ...</p>
            <p className="text-xs" style={{ color: "#5a3a08" }}>เฉพาะเจ้าของห้องเท่านั้นที่สุ่มคำตอบได้</p>
            {room.topic && (
              <div className="mt-3 inline-block px-4 py-3 rounded"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid #c8911a" }}>
                <p className="text-[10px] mb-1" style={{ color: "#9a6e10" }}>หัวข้อที่เลือก</p>
                <p className="text-sm font-bold" style={{ color: "#f5d680" }}>{room.topic}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 text-sm font-semibold rounded"
          style={{ background: "rgba(251,113,133,0.1)", color: "#fb7185", border: "1px solid rgba(251,113,133,0.25)" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Start Game (host only) ── */}
      {amHost && (
        <div className="p-4" style={rpgCard}>
          {needAnswer.length > 0 ? (
            <p className="text-xs text-center" style={{ color: "#6b4a1a" }}>
              ⏳ กด "สุ่มคำตอบให้ทุกคน" ก่อนเริ่มเกม ({readyCount}/{activePlayers.length} พร้อม)
            </p>
          ) : (
            <button onClick={handleStart} disabled={loading}
              className="w-full py-4 text-base font-black tracking-wider transition-all hover:brightness-110 disabled:opacity-40"
              style={rpgBtnPrimary}>
              ⚔️ เริ่มเกม!
            </button>
          )}
        </div>
      )}
      {!amHost && needAnswer.length === 0 && (
        <div className="p-4 text-center" style={rpgCard}>
          <p className="text-sm font-bold" style={{ color: "#c8911a" }}>✅ ทุกคนพร้อม — รอ Host กดเริ่มเกม</p>
        </div>
      )}
    </div>
  );
}
