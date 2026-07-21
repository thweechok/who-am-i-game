"use client";

import { useState } from "react";
import type { PublicRoomState } from "@/lib/types";
import { setupAI, startGame } from "@/lib/api-client";

const setupStyles = `
  @keyframes slideUpFade {
    0% { opacity: 0; transform: translateY(15px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseCartoon {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }
  @keyframes shimmerOrange {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .animate-stagger-1 { animation: slideUpFade 0.4s ease-out 0.1s both; }
  .animate-stagger-2 { animation: slideUpFade 0.4s ease-out 0.2s both; }
  .animate-stagger-3 { animation: slideUpFade 0.4s ease-out 0.3s both; }
  
  .topic-btn {
    transition: all 0.2s ease;
  }
  .topic-btn:hover {
    transform: scale(1.05);
    border-color: #FF8C42 !important;
    box-shadow: 0 4px 12px rgba(255,140,66,0.15) !important;
    z-index: 10;
  }
  .ai-btn {
    animation: pulseCartoon 2.5s infinite;
  }
  .start-btn {
    animation: pulseCartoon 1.5s infinite;
  }
  .progress-shimmer {
    background: linear-gradient(90deg, #FF8C42 25%, #FFA56B 50%, #FF8C42 75%);
    background-size: 200% auto;
    animation: shimmerOrange 2.5s linear infinite;
  }
  .progress-shimmer-full {
    background: linear-gradient(90deg, #51CF66 25%, #7DE590 50%, #51CF66 75%);
    background-size: 200% auto;
    animation: shimmerOrange 2s linear infinite;
  }
  .cartoon-press:active:not(:disabled) {
    transform: translateY(4px) !important;
    box-shadow: 0 0 0 transparent !important;
  }
`;

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

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string; color: string; shadow: string }[] = [
  { value: "easy",   label: "🟢 ง่าย",  desc: "ทุกคนรู้จัก", color: "#51CF66", shadow: "#3BAA4C" },
  { value: "medium", label: "🟡 กลาง", desc: "คิดนิดหน่อย", color: "#FF8C42", shadow: "#D96A25" },
  { value: "hard",   label: "🔴 ยาก",  desc: "ต้องรู้เยอะ", color: "#FF5252", shadow: "#D32F2F" },
];

const cartoonCard = {
  backgroundColor: "rgba(37,21,69,0.6)",
  border: "1px solid rgba(151,117,250,0.15)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  borderRadius: "16px",
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
  // BUG-22 fix: own answer is in room.myAnswer (not room.answers) due to toPublic stripping it
  const readyCount     = activePlayers.filter(p =>
    p.id === playerId ? room.myAnswerAssigned : !!room.answers[p.id]
  ).length;
  const needAnswer     = activePlayers.filter(p =>
    p.id === playerId ? !room.myAnswerAssigned : !room.answers[p.id]
  );
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
    <div className="w-full max-w-3xl mx-auto animate-slide-up space-y-4">
      <style>{setupStyles}</style>

      {/* ── Progress & Player List ── */}
      <div className="p-5 animate-stagger-1" style={cartoonCard}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-bold" style={{ color: "#e2e8f0" }}>🎮 ความพร้อมของผู้เล่น</span>
          <span className="text-sm font-black" style={{ color: "#FF8C42" }}>{readyCount}/{activePlayers.length} คน</span>
        </div>
        
        <div className="h-4 rounded-full overflow-hidden mb-4" style={{ backgroundColor: "rgba(37,21,69,0.5)", border: "1px solid #DFE6E9" }}>
          <div className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? 'progress-shimmer-full' : 'progress-shimmer'}`}
            style={{ width: `${progressPct}%`, background: progressPct === 0 ? "transparent" : undefined }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {activePlayers.map(p => {
            const isReady = p.id === playerId ? room.myAnswerAssigned : !!room.answers[p.id];
            return (
              <div key={p.id} className="p-2 rounded-xl text-center flex flex-col justify-center shadow-sm" 
                style={{ backgroundColor: "rgba(37,21,69,0.6)", border: isReady ? "2px solid #51CF66" : "1px solid #DFE6E9" }}>
                <span className="text-sm font-bold block truncate" style={{ color: "#e2e8f0" }}>{p.name}</span>
                <span className="text-[10px] font-bold mt-1" style={{ color: isReady ? "#51CF66" : "#B2BEC3" }}>
                  {isReady ? "✅ พร้อมแล้ว" : "รอคำตอบ..."}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI Setup (Host only sees controls) ── */}
      <div className="p-5 space-y-5 animate-stagger-2" style={cartoonCard}>
        <div className="flex items-center gap-2 mb-1 border-b pb-3 border-gray-100">
          <span className="text-2xl">✨</span>
          <span className="text-lg font-black" style={{ color: "#e2e8f0" }}>
            สุ่มหัวข้อด้วย AI
          </span>
          {!amHost && <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(37,21,69,0.5)", color: "#a89cc8" }}>👁️ ดูเท่านั้น</span>}
        </div>

        {amHost ? (
          <>
            {/* Group filter */}
            <div>
              <p className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: "#e2e8f0" }}>📂 หมวดหมู่</p>
              <div className="flex flex-wrap gap-2">
                {GROUPS.map(g => (
                  <button key={g} onClick={() => setActiveGroup(g)}
                    className="px-4 py-2 text-sm font-bold transition-all rounded-full cartoon-press"
                    style={activeGroup === g ? {
                      backgroundColor: "#4DACF7",
                      color: "rgba(37,21,69,0.6)",
                      boxShadow: "0 4px 0 #2A8CD8",
                      border: "none",
                    } : {
                      backgroundColor: "rgba(37,21,69,0.4)",
                      color: "#a89cc8",
                      border: "1px solid #DFE6E9",
                    }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic grid */}
            <div>
              <p className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: "#e2e8f0" }}>📌 เลือกหัวข้อ</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {filteredTopics.map((topic) => {
                  const isActive = !useCustom && selectedTopic === topic.value;
                  return (
                    <button key={topic.value}
                      onClick={() => { setSelectedTopic(topic.value); setUseCustom(false); }}
                      className="p-3 flex flex-col items-center justify-center gap-2 text-center rounded-xl topic-btn cartoon-press"
                      style={isActive ? {
                        backgroundColor: "rgba(255,140,66,0.12)",
                        border: "2px solid #FF8C42",
                        color: "#FF8C42",
                      } : {
                        backgroundColor: "rgba(37,21,69,0.6)",
                        border: "1px solid rgba(151,117,250,0.15)",
                        color: "#a89cc8",
                      }}>
                      <span className="text-3xl drop-shadow-sm">{topic.emoji}</span>
                      <span className="text-xs font-bold leading-tight">
                        {topic.label}
                      </span>
                    </button>
                  );
                })}
                <button onClick={() => setUseCustom(true)}
                  className="p-3 flex flex-col items-center justify-center gap-2 text-center rounded-xl topic-btn cartoon-press"
                  style={useCustom ? {
                    backgroundColor: "rgba(255,140,66,0.12)",
                    border: "2px solid #FF8C42",
                    color: "#FF8C42",
                  } : {
                    backgroundColor: "rgba(37,21,69,0.3)",
                    border: "2px dashed #DFE6E9",
                    color: "#a89cc8",
                  }}>
                  <span className="text-3xl drop-shadow-sm">✏️</span>
                  <span className="text-xs font-bold">กำหนดเอง</span>
                </button>
              </div>
              {useCustom && (
                <input value={customTopic} onChange={e => setCustomTopic(e.target.value)}
                  placeholder="เช่น นักร้องไทยยุค 90..." autoFocus maxLength={80}
                  className="mt-3 w-full px-4 py-3 text-sm font-semibold rounded-xl outline-none transition-all focus:ring-2 focus:ring-orange-300"
                  style={{ backgroundColor: "rgba(37,21,69,0.4)", border: "2px solid #FF8C42", color: "#e2e8f0" }} />
              )}
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-sm font-bold mb-3 flex items-center gap-1" style={{ color: "#e2e8f0" }}>🔥 ระดับความยาก</p>
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTY_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setDifficulty(opt.value)}
                    className="py-3 px-2 text-sm font-bold text-center transition-all rounded-full cartoon-press"
                    style={difficulty === opt.value ? {
                      backgroundColor: opt.color,
                      color: "rgba(37,21,69,0.6)",
                      boxShadow: `0 4px 0 ${opt.shadow}`,
                      border: "none",
                    } : {
                      backgroundColor: "rgba(37,21,69,0.6)",
                      color: "#a89cc8",
                      border: "2px solid #DFE6E9",
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI button */}
            {aiDone && (
              <div className="px-4 py-3 text-sm text-center font-bold rounded-xl"
                style={{ backgroundColor: "rgba(81,207,102,0.15)", color: "#3BAA4C", border: "2px solid #51CF66" }}>
                ✅ สุ่มคำตอบให้ทุกคนแล้ว!
              </div>
            )}
            <button onClick={handleAI} disabled={loading || !effectiveTopic}
              className="w-full py-4 text-lg font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed ai-btn cartoon-press rounded-full"
              style={{ 
                backgroundColor: "#FF8C42", 
                color: "rgba(37,21,69,0.6)", 
                boxShadow: "0 6px 0 #D96A25", 
                border: "none" 
              }}>
              {loading ? "🤖 กำลังสุ่ม..." : "✨ สุ่มคำตอบให้ทุกคน"}
            </button>
          </>
        ) : (
          /* Non-host: read-only */
          <div className="text-center py-8 space-y-4">
            <p className="text-lg font-black" style={{ color: "#FF8C42" }}>⏳ รอ Host เลือกหัวข้อ...</p>
            <p className="text-sm font-bold" style={{ color: "#a89cc8" }}>เฉพาะเจ้าของห้องเท่านั้นที่สุ่มคำตอบได้</p>
            {room.topic && (
              <div className="mt-4 inline-block px-6 py-4 rounded-xl shadow-sm"
                style={{ backgroundColor: "rgba(255,140,66,0.12)", border: "2px solid #FFCDAD" }}>
                <p className="text-xs font-bold mb-1" style={{ color: "#D96A25" }}>หัวข้อที่เลือก</p>
                <p className="text-lg font-black" style={{ color: "#FF8C42" }}>{room.topic}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-4 text-sm font-bold rounded-xl"
          style={{ backgroundColor: "rgba(255,107,107,0.15)", color: "#D32F2F", border: "2px solid #FF5252" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Start Game (host only) ── */}
      {amHost && (
        <div className="p-5 space-y-3 animate-stagger-3" style={cartoonCard}>
          {needAnswer.length > 0 && (
            <p className="text-sm text-center font-bold pb-2" style={{ color: "#FF8C42" }}>
              ⚠️ กด "สุ่มคำตอบให้ทุกคน" ด้านบนก่อน ({readyCount}/{activePlayers.length} พร้อม)
            </p>
          )}
          <button onClick={handleStart} disabled={loading || needAnswer.length > 0}
            className="w-full py-4 text-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed start-btn cartoon-press rounded-full"
            style={{ 
              backgroundColor: "#51CF66", 
              color: "rgba(37,21,69,0.6)", 
              boxShadow: "0 6px 0 #3BAA4C", 
              border: "none" 
            }}>
            ⚔️ เริ่มเกม!
          </button>
        </div>
      )}
      {!amHost && (
        <div className="p-5 text-center animate-stagger-3" style={cartoonCard}>
          {needAnswer.length === 0 ? (
            <p className="text-lg font-black" style={{ color: "#51CF66" }}>✅ ทุกคนพร้อม — รอ Host กดเริ่มเกม</p>
          ) : (
            <>
              <p className="text-lg font-black" style={{ color: "#FF8C42" }}>⏳ รอ Host สุ่มคำตอบ... ({readyCount}/{activePlayers.length} คน)</p>
              <p className="text-sm font-bold mt-2" style={{ color: "#a89cc8" }}>เฉพาะเจ้าของห้องเท่านั้นที่สุ่มคำตอบได้</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
