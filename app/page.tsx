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
    color: "#6366f1",
  },
  {
    icon: "✏️",
    title: "ตั้งคำตอบให้กัน",
    desc: "แต่ละคนตั้งชื่อให้คนอื่น เช่น 'เมซซี่' หรือใช้ AI สุ่มให้อัตโนมัติ — ห้ามตั้งให้ตัวเอง!",
    color: "#8b5cf6",
  },
  {
    icon: "❓",
    title: "ถามคำถาม yes/no",
    desc: "ถึงตาคุณ? ถามได้เลย เช่น 'ฉันเป็นนักกีฬาไหม?' คนอื่นจะตอบ ใช่/ไม่ใช่/อาจจะ",
    color: "#38bdf8",
  },
  {
    icon: "🤖",
    title: "ไม่รู้? ถาม AI ช่วยได้!",
    desc: "ถ้าคนอื่นไม่รู้คำตอบ กด 'ถาม AI' — AI จะค้นหาข้อมูลและตอบแทนโดยอัตโนมัติ",
    color: "#34d399",
  },
  {
    icon: "🎯",
    title: "ทายชื่อตัวเอง",
    desc: "คิดว่ารู้แล้ว? กด 'ทาย!' — ทายถูกได้คะแนน แต่ทายผิดหมดสิทธิ์รอบนั้นทันที!",
    color: "#fbbf24",
  },
  {
    icon: "🏆",
    title: "คะแนนและชนะ",
    desc: "ทายถูกก่อน = 3 แต้ม | ที่ 2 = 2 แต้ม | ที่ 3 = 1 แต้ม เล่นหลายรอบสะสมแต้มรวมได้!",
    color: "#fb7185",
  },
];

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", animation: "fadeIn 0.2s ease-out" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{
          animation: "slideUpFade 0.3s ease-out",
          background: "rgba(10,12,30,0.98)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 60px rgba(99,102,241,0.15)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">วิธีเล่น WHO AM I?</h2>
              <p className="text-xs text-slate-500 mt-1">ทายให้ออกว่าคุณคือใคร ก่อนสิทธิ์หมด!</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all"
              style={{ background: "rgba(255,255,255,0.08)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}
            >✕</button>
          </div>
        </div>

        {/* Steps */}
        <div className="px-5 pb-5 pt-3 space-y-3">
          {HOW_TO_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex gap-4 p-4 rounded-2xl transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                animation: `slideUpFade 0.35s ease-out ${i * 0.06}s both`,
              }}
            >
              {/* Icon */}
              <div
                className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
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
                <p className="text-sm font-bold text-slate-200 mb-0.5">{step.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}

          {/* Score table */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)", animation: "slideUpFade 0.35s ease-out 0.36s both" }}
          >
            <div className="px-4 py-2.5" style={{ background: "rgba(251,191,36,0.08)" }}>
              <p className="text-xs font-black text-yellow-400 uppercase tracking-wider">🏅 ตารางคะแนน</p>
            </div>
            <div className="grid grid-cols-3 divide-x" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {[
                { rank: "🥇 ที่ 1", pts: "3 แต้ม", color: "#fbbf24" },
                { rank: "🥈 ที่ 2", pts: "2 แต้ม", color: "#94a3b8" },
                { rank: "🥉 ที่ 3", pts: "1 แต้ม", color: "#cd7c39" },
              ].map((r) => (
                <div key={r.rank} className="flex flex-col items-center py-3 px-2">
                  <span className="text-sm font-bold" style={{ color: r.color }}>{r.pts}</span>
                  <span className="text-[10px] text-slate-600 mt-0.5">{r.rank}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: "rgba(56,189,248,0.07)",
              border: "1px solid rgba(56,189,248,0.15)",
              animation: "slideUpFade 0.35s ease-out 0.42s both",
            }}
          >
            <p className="text-xs font-black text-cyan-400 mb-2">💡 เทคนิค</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• ถามเรื่องอาชีพ, ประเทศ, เพศ, ยุคสมัย ก่อน — แคบลงเรื่อยๆ</li>
              <li>• อย่าทายจนกว่าจะมั่นใจ 80%+ ขึ้นไป</li>
              <li>• กด 🤖 ถาม AI ถ้าไม่รู้จะตอบ ใช่/ไม่ใช่ ให้ใคร</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
              animation: "slideUpFade 0.35s ease-out 0.48s both",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
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
    accent: "#7c3aed",
    accentLight: "#a78bfa",
    glow: "rgba(124,58,237,0.6)",
    tag: "พร้อมเล่น",
    tagColor: "#34d399",
  },
  {
    id: "coming-2",
    title: "Coming Soon",
    titleTH: "เร็วๆ นี้",
    genre: ["🔒 กำลังพัฒนา"],
    description: "เกมใหม่จาก SanukHub กำลังจะมาเร็วๆ นี้...",
    cover: null, thumb: null, available: false,
    accent: "#334155", accentLight: "#64748b", glow: "rgba(51,65,85,0.3)",
    tag: "เร็วๆ นี้", tagColor: "#64748b",
  },
  {
    id: "coming-3",
    title: "Coming Soon",
    titleTH: "เร็วๆ นี้",
    genre: ["🔒 กำลังพัฒนา"],
    description: "เกมใหม่จาก SanukHub กำลังจะมาเร็วๆ นี้...",
    cover: null, thumb: null, available: false,
    accent: "#334155", accentLight: "#64748b", glow: "rgba(51,65,85,0.3)",
    tag: "เร็วๆ นี้", tagColor: "#64748b",
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

  const inputCls = "w-full rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-200";
  const inputStyle = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", animation: "fadeIn 0.2s ease-out" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ animation: "slideUpFade 0.3s ease-out", boxShadow: `0 -8px 60px ${game.glow}, 0 40px 80px rgba(0,0,0,0.6)`, border: `1px solid ${game.accent}50` }}>
        {/* Modal cover header */}
        {game.cover && (
          <div className="relative h-32 overflow-hidden">
            <Image src={game.cover} alt="" fill className="object-cover object-top" style={{ filter: "brightness(0.4)" }} />
            <div className="absolute inset-0 flex flex-col justify-end p-5"
              style={{ background: "linear-gradient(to top, rgba(10,12,30,1), rgba(10,12,30,0.2))" }}>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{game.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `${game.tagColor}25`, color: game.tagColor }}>
                  {game.tag}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all"
              style={{ background: "rgba(0,0,0,0.6)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>✕</button>
          </div>
        )}

        <div className="p-5" style={{ background: "rgba(10,12,30,1)" }}>
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl mb-4" style={{ background: "rgba(255,255,255,0.04)" }}>
            {(["create","join"] as const).map((m) => (
              <button key={m} id={`modal-tab-${m}`} onClick={() => setMode(m)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
                style={mode === m
                  ? { background: `linear-gradient(135deg, ${game.accent}, ${game.accentLight})`, color: "#fff", boxShadow: `0 4px 16px ${game.glow}` }
                  : { color: "#475569" }}>
                {m === "create" ? "🏠 สร้างห้อง" : "🚪 เข้าร่วม"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input id="modal-player-name" value={name} onChange={(e) => setName(e.target.value)}
              maxLength={20} placeholder="ชื่อเล่น เช่น บอย" autoComplete="off"
              className={inputCls} style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor=game.accent; e.currentTarget.style.boxShadow=`0 0 0 3px ${game.glow}30`; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow="none"; }}
            />
            {mode === "join" && (
              <input id="modal-room-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={4} placeholder="ABCD" autoComplete="off"
                className={`${inputCls} text-center text-2xl font-mono tracking-[0.5em]`} style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor=game.accentLight; e.currentTarget.style.boxShadow=`0 0 0 3px ${game.glow}25`; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow="none"; }}
              />
            )}
            {error && <div className="rounded-xl px-3 py-2 text-sm animate-slide-up" style={{ background:"rgba(251,113,133,0.12)", color:"#fb7185" }}>⚠ {error}</div>}
            <button id="modal-btn-submit" type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all duration-200 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${game.accent}, ${game.accentLight})`, boxShadow: `0 8px 32px ${game.glow}` }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform="translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform=""; }}>
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
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: `${(i * 19 + 5) % 94}%`, y: `${(i * 31 + 8) % 88}%`,
    size: 2 + (i % 5),
    dur: `${4 + (i % 6) * 1.2}s`, delay: `${(i % 8) * 0.5}s`,
    color: [accent, "#fbbf24", "#38bdf8", "#f472b6", "#34d399"][i % 5],
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <div key={i} className="absolute rounded-full"
          style={{ left:p.x, top:p.y, width:p.size, height:p.size, background:p.color, opacity:0.2+i%3*0.06,
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
    <div className="relative min-h-dvh flex flex-col overflow-hidden" style={{ userSelect: "none" }}>
      {/* Background */}
      <div className="absolute inset-0">
        {selected.cover ? (
          <Image src={selected.cover} alt="" fill className="object-cover object-center"
            style={{ opacity: 0.25, filter: "blur(3px)", transform: "scale(1.08)" }} priority />
        ) : null}
        {/* Radial glow from right */}
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse 70% 80% at 75% 45%, ${selected.glow} 0%, transparent 65%)`
        }} />
        {/* Dark base overlay */}
        <div className="absolute inset-0" style={{
          background: `
            linear-gradient(105deg, rgba(8,10,28,0.97) 0%, rgba(8,10,28,0.8) 38%, rgba(8,10,28,0.15) 65%, rgba(8,10,28,0.7) 100%),
            linear-gradient(to bottom, rgba(8,10,28,0.6) 0%, transparent 20%, transparent 75%, rgba(8,10,28,1) 100%)
          `
        }} />
      </div>

      <Particles accent={selected.accent} />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5"
        style={{ animation: "slideUpFade 0.4s ease-out" }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg text-white"
              style={{ background: `linear-gradient(135deg, ${selected.accent}, ${selected.accentLight})`,
                boxShadow: `0 0 20px ${selected.glow}` }}>S</div>
            <span className="font-black text-xl text-white tracking-tight">SanukHub</span>
          </div>
          <div className="hidden sm:flex gap-1">
            {["เกม","สื่อ"].map((t, i) => (
              <button key={t} className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={i===0
                  ? { background:"rgba(255,255,255,0.08)", color:"#e2e8f0", backdropFilter:"blur(8px)" }
                  : { color:"#475569" }}>{t}</button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-600 hidden sm:block">🎮 สนุกไปด้วยกัน</p>
      </nav>

      {/* Hero — 2-column layout */}
      <div className="relative z-10 flex-1 flex items-center px-8 pb-44 md:pb-36 gap-8 md:gap-16" key={key}>

        {/* Left — game info */}
        <div className="flex-1 max-w-lg" style={{ animation: "slideUpFade 0.45s ease-out 0.05s both" }}>
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-5"
            style={{ background:`${selected.tagColor}15`, color:selected.tagColor,
              border:`1px solid ${selected.tagColor}35`,
              boxShadow: selected.available ? `0 0 16px ${selected.tagColor}20` : "none" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-success" style={{ background:selected.tagColor }} />
            {selected.tag}
          </div>

          {/* Title */}
          <h1 className="font-black leading-none mb-2"
            style={{ fontSize:"clamp(2.5rem, 6vw, 4.5rem)",
              color:"#fff",
              textShadow:`0 0 60px ${selected.glow}, 0 4px 20px rgba(0,0,0,0.5)`,
              letterSpacing:"-0.02em" }}>
            {selected.title}
          </h1>
          <p className="font-bold text-xl mb-5" style={{ color:selected.accentLight }}>
            {selected.titleTH}
          </p>

          {/* Genre pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {selected.genre.map((g) => (
              <span key={g} className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background:"rgba(255,255,255,0.07)", color:"#94a3b8",
                  border:"1px solid rgba(255,255,255,0.08)" }}>{g}</span>
            ))}
          </div>

          {/* Description */}
          <p className="text-slate-400 text-base leading-relaxed mb-8"
            style={{ whiteSpace:"pre-line" }}>{selected.description}</p>

          {/* CTA */}
          {selected.available ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button id="btn-play-game" onClick={() => setShowModal(true)}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-lg text-white overflow-hidden transition-all duration-300"
                style={{ background:`linear-gradient(135deg, ${selected.accent}, ${selected.accentLight})`,
                  boxShadow:`0 8px 40px ${selected.glow}, 0 4px 16px rgba(0,0,0,0.3)` }}
                onMouseEnter={(e) => { e.currentTarget.style.transform="translateY(-3px) scale(1.03)";
                  e.currentTarget.style.boxShadow=`0 20px 60px ${selected.glow}, 0 4px 16px rgba(0,0,0,0.4)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform="";
                  e.currentTarget.style.boxShadow=`0 8px 40px ${selected.glow}, 0 4px 16px rgba(0,0,0,0.3)`; }}>
                {/* Shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background:"linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.2) 50%,transparent 70%)",
                    animation:"shimmer 1.8s linear infinite" }} />
                <span className="text-xl">▶</span> เล่นเลย
              </button>
              <button onClick={() => { setShowModal(true); }}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-sm transition-all duration-200"
                style={{ background:"rgba(255,255,255,0.06)", color:"#94a3b8",
                  border:"1px solid rgba(255,255,255,0.1)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#e2e8f0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background="rgba(255,255,255,0.06)"; e.currentTarget.style.color="#94a3b8"; }}>
                🚪 เข้าห้อง
              </button>
            </div>
          ) : (
            <button disabled className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg cursor-not-allowed"
              style={{ background:"rgba(255,255,255,0.04)", color:"#334155", border:"1px solid rgba(255,255,255,0.06)" }}>
              🔒 เร็วๆ นี้
            </button>
          )}
        </div>

        {/* Right — floating game box art */}
        {selected.cover && (
          <div className="hidden lg:flex flex-1 items-center justify-center"
            style={{ animation: "slideUpFade 0.55s ease-out 0.1s both" }}>
            <div className="relative" style={{
              animation: "float 5s ease-in-out infinite",
              filter: `drop-shadow(0 32px 64px ${selected.glow}) drop-shadow(0 8px 24px rgba(0,0,0,0.6))`,
            }}>
              {/* Glow ring behind */}
              <div className="absolute -inset-6 rounded-3xl opacity-30 blur-2xl"
                style={{ background: `radial-gradient(circle, ${selected.accent}, transparent 70%)` }} />
              {/* Cover card */}
              <div className="relative rounded-3xl overflow-hidden"
                style={{ width:"340px", height:"340px",
                  border:`2px solid ${selected.accent}60`,
                  boxShadow:`0 0 0 1px ${selected.accentLight}20, inset 0 0 0 1px rgba(255,255,255,0.1)`,
                  transform:"rotate(-3deg)",
                  transition:"transform 0.3s ease" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform="rotate(0deg) scale(1.03)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform="rotate(-3deg)"; }}>
                <Image src={selected.cover} alt={selected.title} fill className="object-cover" />
                {/* Glossy overlay */}
                <div className="absolute inset-0"
                  style={{ background:"linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom — game carousel */}
      <div className="relative z-10 absolute bottom-0 left-0 right-0 pb-6"
        style={{ animation: "slideUpFade 0.5s ease-out 0.2s both" }}>
        {/* Frosted glass bar */}
        <div className="mx-4 rounded-2xl px-5 py-4"
          style={{ background:"rgba(8,10,28,0.85)", backdropFilter:"blur(20px)",
            border:"1px solid rgba(255,255,255,0.07)",
            boxShadow:"0 -8px 32px rgba(0,0,0,0.3)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">
            เกมทั้งหมด
          </p>
          <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
            {GAMES.map((game, idx) => {
              const active = idx === selectedIdx;
              return (
                <button key={game.id} id={`game-card-${game.id}`} onClick={() => pick(idx)}
                  className="flex-shrink-0 relative rounded-xl overflow-hidden group transition-all duration-350"
                  style={{ width:"160px", height:"95px",
                    border:`2px solid ${active ? game.accent : "rgba(255,255,255,0.06)"}`,
                    boxShadow: active ? `0 0 24px ${game.glow}, 0 8px 24px rgba(0,0,0,0.4)` : "none",
                    transform: active ? "translateY(-4px)" : "none",
                    transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
                  {/* Thumbnail */}
                  {game.thumb
                    ? <Image src={game.thumb} alt={game.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110"
                        style={{ opacity: game.available ? 1 : 0.2 }} />
                    : <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background:"rgba(255,255,255,0.03)" }}>
                        <span className="text-3xl opacity-15">🎮</span>
                      </div>}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 transition-all duration-300"
                    style={{ background: active
                      ? "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)"
                      : "rgba(0,0,0,0.4)" }} />
                  {/* Label */}
                  <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2">
                    <p className="text-[11px] font-black text-white truncate"
                      style={{ textShadow:"0 1px 4px rgba(0,0,0,0.9)" }}>
                      {game.available ? game.title : "เร็วๆ นี้"}
                    </p>
                    {active && <p className="text-[9px] mt-0.5" style={{ color:game.accentLight }}>{game.tag}</p>}
                  </div>
                  {/* Active dot */}
                  {active && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full"
                      style={{ background:game.tagColor, boxShadow:`0 0 8px ${game.tagColor}`, animation:"pulse-success 2s infinite" }} />
                  )}
                  {/* Shimmer on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                    style={{ background:"linear-gradient(135deg, rgba(255,255,255,0.07), transparent 60%)" }} />
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
