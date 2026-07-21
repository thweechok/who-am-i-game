"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createRoom, joinRoom } from "@/lib/api-client";

/* ── How To Play Modal ──────────────────────────────────────────────────── */
const HOW_TO_STEPS = [
  {
    icon: "🏠",
    title: "สร้างหรือเข้าร่วมห้อง",
    desc: "คนหนึ่งสร้างห้อง แล้วแชร์รหัส 4 ตัวให้เพื่อน 1-5 คนเข้าร่วม",
    color: "#4DACF7",
  },
  {
    icon: "✏️",
    title: "ตั้งคำตอบให้กัน",
    desc: "แต่ละคนตั้งชื่อให้คนอื่น เช่น 'เมซซี่' หรือใช้ AI สุ่มให้อัตโนมัติ — ห้ามตั้งให้ตัวเอง!",
    color: "#9775FA",
  },
  {
    icon: "❓",
    title: "ถามคำถาม yes/no",
    desc: "ถึงตาคุณ? ถามได้เลย เช่น 'ฉันเป็นนักกีฬาไหม?' คนอื่นจะตอบ ใช่/ไม่ใช่/อาจจะ",
    color: "#51CF66",
  },
  {
    icon: "🤖",
    title: "ไม่รู้? ถาม AI ช่วยได้!",
    desc: "ถ้าคนอื่นไม่รู้คำตอบ กด 'ถาม AI' — AI จะค้นหาข้อมูลและตอบแทนโดยอัตโนมัติ",
    color: "#4DACF7",
  },
  {
    icon: "🎯",
    title: "ทายชื่อตัวเอง",
    desc: "คิดว่ารู้แล้ว? กด 'ทาย!' — ทายถูกได้คะแนน แต่ทายผิดหมดสิทธิ์รอบนั้นทันที!",
    color: "#FF8C42",
  },
  {
    icon: "🏆",
    title: "คะแนนและชนะ",
    desc: "ทายถูกก่อน = 3 แต้ม | ที่ 2 = 2 แต้ม | ที่ 3 = 1 แต้ม เล่นหลายรอบสะสมแต้มรวมได้!",
    color: "#FF6B6B",
  },
];

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease-out" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          animation: "slideUpFade 0.3s ease-out",
          background: "#FFFFFF",
          border: "1px solid #E0E0E0",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black" style={{ color: "#2D3436" }}>วิธีเล่น WHO AM I?</h2>
              <p className="text-xs mt-1" style={{ color: "#636E72" }}>ทายให้ออกว่าคุณคือใคร ก่อนสิทธิ์หมด!</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all hover:bg-gray-100"
              style={{ color: "#636E72", border: "1px solid #E0E0E0" }}
            >✕</button>
          </div>
        </div>

        {/* Steps */}
        <div className="px-5 pb-5 pt-4 space-y-3">
          {HOW_TO_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex gap-4 p-4 rounded-xl transition-all duration-200"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E0E0E0",
                borderLeft: `4px solid ${step.color}`,
                boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                animation: `slideUpFade 0.35s ease-out ${i * 0.06}s both`,
              }}
            >
              {/* Icon */}
              <div
                className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl"
                style={{ background: `${step.color}15` }}
              >
                {step.icon}
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: `${step.color}15`, color: step.color }}
                  >
                    ขั้นตอน {i + 1}
                  </span>
                </div>
                <p className="text-sm font-bold mb-0.5" style={{ color: "#2D3436" }}>{step.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "#636E72" }}>{step.desc}</p>
              </div>
            </div>
          ))}

          {/* Score table */}
          <div
            className="rounded-xl overflow-hidden mt-4"
            style={{ border: "1px solid #E0E0E0", animation: "slideUpFade 0.35s ease-out 0.36s both" }}
          >
            <div className="px-4 py-2.5" style={{ background: "#FFF8F0" }}>
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: "#FF8C42" }}>🏅 ตารางคะแนน</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white">
              {[
                { rank: "🥇 ที่ 1", pts: "3 แต้ม", color: "#FF8C42" },
                { rank: "🥈 ที่ 2", pts: "2 แต้ม", color: "#4DACF7" },
                { rank: "🥉 ที่ 3", pts: "1 แต้ม", color: "#9775FA" },
              ].map((r) => (
                <div key={r.rank} className="flex flex-col items-center py-3 px-2">
                  <span className="text-sm font-bold" style={{ color: r.color }}>{r.pts}</span>
                  <span className="text-[10px] mt-0.5" style={{ color: "#636E72" }}>{r.rank}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div
            className="rounded-xl p-4 mt-3"
            style={{
              background: "#F0F8FF",
              border: "1px solid #4DACF7",
              animation: "slideUpFade 0.35s ease-out 0.42s both",
            }}
          >
            <p className="text-xs font-black mb-2" style={{ color: "#4DACF7" }}>💡 เทคนิค</p>
            <ul className="text-xs space-y-1" style={{ color: "#636E72" }}>
              <li>• ถามเรื่องอาชีพ, ประเทศ, เพศ, ยุคสมัย ก่อน — แคบลงเรื่อยๆ</li>
              <li>• อย่าทายจนกว่าจะมั่นใจ 80%+ ขึ้นไป</li>
              <li>• กด 🤖 ถาม AI ถ้าไม่รู้จะตอบ ใช่/ไม่ใช่ ให้ใคร</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 mt-4 rounded-full font-black text-white text-sm transition-all duration-200"
            style={{
              background: "#FF8C42",
              boxShadow: "0 4px 0 #D4712E",
              animation: "slideUpFade 0.35s ease-out 0.48s both",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(2px)"; e.currentTarget.style.boxShadow = "0 2px 0 #D4712E"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 0 #D4712E"; }}
          >
            เข้าใจแล้ว! เล่นเลย 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

const GAMES = [
  {
    id: "who-am-i",
    title: "WHO AM I?",
    titleTH: "ฉันคือใคร?",
    genre: ["🎉 ปาร์ตี้", "❓ ทายคำ", "👥 2–6 คน"],
    description: "คำตอบถูกซ่อนไว้บนหัวคุณ — ถามได้แค่ yes/no!\nใครจะทายออกก่อนกัน?",
    cover: "/who-am-i-cover.png",
    thumb: "/who-am-i-thumb.png",
    available: true,
    accent: "#FF8C42",
    accentLight: "#FFAA6E",
    tag: "พร้อมเล่น",
    tagColor: "#51CF66",
  },
  {
    id: "coming-2",
    title: "Coming Soon",
    titleTH: "เร็วๆ นี้",
    genre: ["🔒 กำลังพัฒนา"],
    description: "เกมใหม่จาก SanukHub กำลังจะมาเร็วๆ นี้...",
    cover: null, thumb: null, available: false,
    accent: "#636E72", accentLight: "#B2BEC3",
    tag: "เร็วๆ นี้", tagColor: "#636E72",
  },
  {
    id: "coming-3",
    title: "Coming Soon",
    titleTH: "เร็วๆ นี้",
    genre: ["🔒 กำลังพัฒนา"],
    description: "เกมใหม่จาก SanukHub กำลังจะมาเร็วๆ นี้...",
    cover: null, thumb: null, available: false,
    accent: "#636E72", accentLight: "#B2BEC3",
    tag: "เร็วๆ นี้", tagColor: "#636E72",
  },
];

/* ── Play Modal ─────────────────────────────────────────────────────────── */
function PlayModal({ game, onClose, initialRoomCode }: { game: typeof GAMES[0]; onClose: () => void; initialRoomCode?: string }) {
  const router = useRouter();
  const [mode, setMode]       = useState<"create" | "join">(initialRoomCode ? "join" : "create");
  const [name, setName]       = useState("");
  const [code, setCode]       = useState(initialRoomCode ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!name.trim()) { setError("ใส่ชื่อเล่นก่อนนะ"); return; }
    setLoading(true);
    try {
      if (mode === "create") {
        const res = await createRoom(name);
        sessionStorage.setItem("playerId", res.playerId);
        sessionStorage.setItem("playerName", res.playerName);
        router.push(`/room/${res.code}`);
      } else {
        const c = code.trim().toUpperCase();
        if (!c) { setError("ใส่รหัสห้องด้วย"); setLoading(false); return; }
        const res = await joinRoom(c, name);
        sessionStorage.setItem("playerId", res.playerId);
        sessionStorage.setItem("playerName", name.trim());
        router.push(`/room/${c}`);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  }

  const inputCls = "w-full rounded-2xl px-4 py-3 text-sm outline-none transition-all duration-200";
  const inputStyle = { background: "#FFFFFF", border: "1px solid #E0E0E0", color: "#2D3436" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease-out" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden bg-white"
        style={{ animation: "slideUpFade 0.3s ease-out", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", border: "1px solid #E0E0E0" }}>
        {/* Modal cover header */}
        {game.cover && (
          <div className="relative h-32 overflow-hidden bg-[#FFF8F0]">
            <Image src={game.cover} alt="" fill className="object-cover object-top" style={{ filter: "brightness(0.9)" }} />
            <div className="absolute inset-0 flex flex-col justify-end p-5"
              style={{ background: "linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))" }}>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black" style={{ color: "#2D3436" }}>{game.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `${game.tagColor}25`, color: game.tagColor }}>
                  {game.tag}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all bg-white hover:bg-gray-50"
              style={{ color: "#636E72", border: "1px solid #E0E0E0" }}>✕</button>
          </div>
        )}

        <div className="p-5" style={{ background: "#FFFFFF" }}>
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: "#F5F5F5", border: "1px solid #E0E0E0" }}>
            {(["create","join"] as const).map((m) => (
              <button key={m} id={`modal-tab-${m}`} onClick={() => setMode(m)}
                className="flex-1 py-2.5 rounded-full text-sm font-bold transition-all duration-200"
                style={mode === m
                  ? { background: "#FF8C42", color: "#fff", boxShadow: "0 2px 0 #D4712E" }
                  : { color: "#636E72", background: "transparent" }}>
                {m === "create" ? "🏠 สร้างห้อง" : "🚪 เข้าร่วม"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input id="modal-player-name" value={name} onChange={(e) => setName(e.target.value)}
              maxLength={20} placeholder="ชื่อเล่น เช่น บอย" autoComplete="off"
              className={inputCls} style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor="#4DACF7"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(77,172,247,0.2)"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor="#E0E0E0"; e.currentTarget.style.boxShadow="none"; }}
            />
            {mode === "join" && (
              <input id="modal-room-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={4} placeholder="ABCD" autoComplete="off"
                className={`${inputCls} text-center text-2xl font-mono tracking-[0.5em]`} style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor="#4DACF7"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(77,172,247,0.2)"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor="#E0E0E0"; e.currentTarget.style.boxShadow="none"; }}
              />
            )}
            {error && <div className="rounded-xl px-3 py-2 text-sm font-bold animate-slide-up" style={{ background:"#FF6B6B20", color:"#FF6B6B", border:"1px solid #FF6B6B50" }}>⚠ {error}</div>}
            <button id="modal-btn-submit" type="submit" disabled={loading}
              className="w-full py-4 rounded-full font-black text-white text-base transition-all duration-200 disabled:opacity-50 mt-2"
              style={{ background: "#FF8C42", boxShadow: "0 4px 0 #D4712E" }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform="translateY(2px)"; e.currentTarget.style.boxShadow="0 2px 0 #D4712E"; } }}
              onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 4px 0 #D4712E"; } }}>
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>กำลังโหลด...</span>
                : mode === "create" ? "✨ สร้างห้องใหม่" : "🚀 เข้าร่วมเกม"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Floating particles ─────────────────────────────────────────────────── */
function Particles({ accent }: { accent: string }) {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    x: `${(i * 19 + 5) % 94}%`, y: `${(i * 31 + 8) % 88}%`,
    size: 6 + (i % 8),
    dur: `${4 + (i % 6) * 1.2}s`, delay: `${(i % 8) * 0.5}s`,
    color: ["#FF8C42", "#4DACF7", "#51CF66", "#FF6B6B", "#9775FA"][i % 5],
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <div key={i} className="absolute rounded-full"
          style={{ left:p.x, top:p.y, width:p.size, height:p.size, background:p.color, opacity:0.6,
            boxShadow: `0 2px 4px rgba(0,0,0,0.1)`,
            animation:`float ${p.dur} ease-in-out ${p.delay} infinite` }} />
      ))}
    </div>
  );
}

/* ── Main launcher ──────────────────────────────────────────────────────── */
function LauncherContent() {
  const searchParams = useSearchParams();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showModal, setShowModal] = useState(!!searchParams.get("room"));
  const [showHowTo, setShowHowTo] = useState(false);
  const [key, setKey] = useState(0);
  const selected = GAMES[selectedIdx];

  function pick(i: number) {
    if (i === selectedIdx) return;
    setSelectedIdx(i); setKey(k => k + 1);
  }

  return (
    <div className="relative min-h-dvh flex flex-col overflow-hidden" style={{ userSelect: "none", background: "#FFF8F0" }}>
      {/* Background */}
      <div className="absolute inset-0">
        {/* Subtle patterned background or bright shapes */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(#FF8C42 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      <Particles accent={selected.accent} />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5"
        style={{ animation: "slideUpFade 0.4s ease-out" }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xl text-white"
              style={{ background: "#FF8C42", boxShadow: "0 3px 0 #D4712E" }}>S</div>
            <span className="font-black text-2xl tracking-tight" style={{ color: "#2D3436" }}>SanukHub</span>
          </div>
          <div className="hidden sm:flex gap-2">
            {["เกม","สื่อ"].map((t, i) => (
              <button key={t} className="px-5 py-2 rounded-full text-sm font-bold transition-all"
                style={i===0
                  ? { background: "#4DACF7", color: "#FFFFFF", boxShadow: "0 3px 0 #3A8BC8" }
                  : { background: "#FFFFFF", color: "#636E72", border: "1px solid #E0E0E0", boxShadow: "0 3px 0 #E0E0E0" }}>{t}</button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowHowTo(true)} className="hidden sm:flex px-5 py-2 rounded-full text-sm font-bold transition-all"
           style={{ background: "#FFFFFF", color: "#2D3436", border: "1px solid #E0E0E0", boxShadow: "0 3px 0 #E0E0E0" }}>
          ❓ วิธีเล่น
        </button>
      </nav>

      {/* Hero — 2-column layout */}
      <div className="relative z-10 flex-1 flex items-center px-8 pb-44 md:pb-36 gap-8 md:gap-16" key={key}>

        {/* Left — game info */}
        <div className="flex-1 max-w-lg" style={{ animation: "slideUpFade 0.45s ease-out 0.05s both" }}>
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black mb-5 bg-white"
            style={{ color: selected.tagColor, border: `2px solid ${selected.tagColor}`, boxShadow: `0 3px 0 ${selected.tagColor}40` }}>
            <span className="w-2 h-2 rounded-full animate-pulse-success" style={{ background: selected.tagColor }} />
            {selected.tag}
          </div>

          {/* Title */}
          <h1 className="font-black leading-tight mb-2"
            style={{ fontSize:"clamp(2.5rem, 6vw, 4.5rem)",
              background: "linear-gradient(to right, #FF8C42, #FF6B6B)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.1))",
              letterSpacing:"-0.02em" }}>
            {selected.title}
          </h1>
          <p className="font-black text-2xl mb-5" style={{ color: "#4DACF7" }}>
            {selected.titleTH}
          </p>

          {/* Genre pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {selected.genre.map((g) => (
              <span key={g} className="px-4 py-1.5 rounded-full text-xs font-bold bg-white"
                style={{ color: "#636E72", border: "1px solid #E0E0E0", boxShadow: "0 2px 0 #E0E0E0" }}>{g}</span>
            ))}
          </div>

          {/* Description */}
          <p className="text-base font-medium leading-relaxed mb-8 bg-white p-4 rounded-2xl"
            style={{ color: "#2D3436", border: "1px solid #E0E0E0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", whiteSpace: "pre-line" }}>
            {selected.description}
          </p>

          {/* CTA */}
          {selected.available ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <button id="btn-play-game" onClick={() => setShowModal(true)}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full font-black text-lg text-white overflow-hidden transition-all duration-200"
                style={{ background: "#FF8C42", boxShadow: "0 6px 0 #D4712E" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform="translateY(2px)"; e.currentTarget.style.boxShadow="0 4px 0 #D4712E"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 6px 0 #D4712E"; }}>
                <span className="text-xl">▶</span> เล่นเลย
              </button>
              <button onClick={() => { setShowModal(true); }}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-black text-lg transition-all duration-200"
                style={{ background: "#FFFFFF", color: "#4DACF7", border: "2px solid #4DACF7", boxShadow: "0 6px 0 #4DACF7" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform="translateY(2px)"; e.currentTarget.style.boxShadow="0 4px 0 #4DACF7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 6px 0 #4DACF7"; }}>
                🚪 เข้าห้อง
              </button>
            </div>
          ) : (
            <button disabled className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-black text-lg cursor-not-allowed"
              style={{ background: "#E0E0E0", color: "#999", boxShadow: "0 6px 0 #BDBDBD" }}>
              🔒 เร็วๆ นี้
            </button>
          )}
        </div>

        {/* Right — floating game box art */}
        {selected.cover && (
          <div className="hidden lg:flex flex-1 items-center justify-center"
            style={{ animation: "slideUpFade 0.55s ease-out 0.1s both" }}>
            <div className="relative" style={{
              animation: "float 4s ease-in-out infinite",
              filter: `drop-shadow(0 20px 30px rgba(0,0,0,0.15))`,
            }}>
              {/* Cover card */}
              <div className="relative rounded-3xl overflow-hidden bg-white"
                style={{ width:"320px", height:"320px",
                  border: `4px solid #FFFFFF`,
                  boxShadow: `0 8px 0 #E0E0E0`,
                  transform:"rotate(-2deg)",
                  transition:"transform 0.3s ease" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform="rotate(0deg) scale(1.02)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform="rotate(-2deg)"; }}>
                <Image src={selected.cover} alt={selected.title} fill className="object-cover" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom — game carousel */}
      <div className="relative z-10 absolute bottom-0 left-0 right-0 pb-6"
        style={{ animation: "slideUpFade 0.5s ease-out 0.2s both" }}>
        {/* Container */}
        <div className="mx-4 rounded-2xl px-5 py-4 bg-white"
          style={{ border: "1px solid #E0E0E0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          <p className="text-[12px] font-black uppercase tracking-widest mb-3" style={{ color: "#FF8C42" }}>
            ⭐ เกมทั้งหมด
          </p>
          <div className="flex gap-4 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
            {GAMES.map((game, idx) => {
              const active = idx === selectedIdx;
              return (
                <button key={game.id} id={`game-card-${game.id}`} onClick={() => pick(idx)}
                  className="flex-shrink-0 relative rounded-2xl overflow-hidden group transition-all duration-300"
                  style={{ width:"160px", height:"100px",
                    background: "#FFFFFF",
                    borderTop: `6px solid ${active ? game.accent : "#E0E0E0"}`,
                    borderLeft: `1px solid ${active ? game.accent : "#E0E0E0"}`,
                    borderRight: `1px solid ${active ? game.accent : "#E0E0E0"}`,
                    borderBottom: `4px solid ${active ? game.accent : "#E0E0E0"}`,
                    transform: active ? "translateY(-4px)" : "none" }}>
                  {/* Thumbnail */}
                  {game.thumb
                    ? <Image src={game.thumb} alt={game.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ opacity: game.available ? 1 : 0.4 }} />
                    : <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <span className="text-3xl opacity-20">🎮</span>
                      </div>}
                  {/* Label background */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white p-2 text-left" style={{ borderTop: "1px solid #E0E0E0" }}>
                    <p className="text-[11px] font-black truncate"
                      style={{ color: "#2D3436" }}>
                      {game.available ? game.title : "เร็วๆ นี้"}
                    </p>
                    {active && <p className="text-[9px] font-bold" style={{ color: game.accent }}>{game.tag}</p>}
                  </div>
                  {/* Active dot */}
                  {active && (
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
                      style={{ background: game.tagColor, boxShadow: `0 0 0 2px #FFF` }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showModal && <PlayModal game={selected} onClose={() => setShowModal(false)} initialRoomCode={searchParams.get("room") ?? undefined} />}
      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <LauncherContent />
    </Suspense>
  );
}
