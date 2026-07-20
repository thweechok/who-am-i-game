"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createRoom, joinRoom } from "@/lib/api-client";

// ─── Game catalogue ────────────────────────────────────────────────────────
const GAMES = [
  {
    id: "who-am-i",
    title: "WHO AM I?",
    titleTH: "ฉันคือใคร?",
    genre: "🎉 ปาร์ตี้  ·  ❓ ทายคำ  ·  👥 2–6 คน",
    description: "คำตอบถูกซ่อนไว้บนหัวคุณ — ถามได้แค่ yes/no! ใครจะทายออกก่อนกัน?",
    cover: "/who-am-i-cover.png",
    thumb: "/who-am-i-thumb.png",
    available: true,
    accent: "#6366f1",
    glow: "rgba(99,102,241,0.5)",
    tag: "✅ พร้อมเล่น",
    tagColor: "#34d399",
    tagBg: "rgba(52,211,153,0.12)",
  },
  {
    id: "coming-2",
    title: "???",
    titleTH: "เร็วๆ นี้",
    genre: "🔒 กำลังพัฒนา",
    description: "เกมใหม่จาก SanukHub กำลังจะมา...",
    cover: null, thumb: null, available: false,
    accent: "#475569", glow: "rgba(71,85,105,0.2)",
    tag: "🔒 เร็วๆ นี้", tagColor: "#64748b", tagBg: "rgba(71,85,105,0.1)",
  },
  {
    id: "coming-3",
    title: "???",
    titleTH: "เร็วๆ นี้",
    genre: "🔒 กำลังพัฒนา",
    description: "เกมใหม่จาก SanukHub กำลังจะมา...",
    cover: null, thumb: null, available: false,
    accent: "#475569", glow: "rgba(71,85,105,0.2)",
    tag: "🔒 เร็วๆ นี้", tagColor: "#64748b", tagBg: "rgba(71,85,105,0.1)",
  },
];

// ─── Floating particles background ────────────────────────────────────────
function Particles() {
  const dots = Array.from({ length: 18 }, (_, i) => ({
    left: `${(i * 23 + 7) % 96}%`,
    top:  `${(i * 37 + 11) % 88}%`,
    size: 3 + (i % 4) * 2,
    duration: `${5 + (i % 5) * 1.4}s`,
    delay: `${(i % 7) * 0.6}s`,
    color: ["#6366f1","#8b5cf6","#fbbf24","#34d399","#38bdf8","#f472b6"][i % 6],
    opacity: 0.15 + (i % 3) * 0.08,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: d.left, top: d.top,
            width: d.size, height: d.size,
            background: d.color,
            opacity: d.opacity,
            animation: `float ${d.duration} ease-in-out ${d.delay} infinite`,
            filter: `blur(${d.size > 6 ? 1 : 0}px)`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Play Modal ────────────────────────────────────────────────────────────
function PlayModal({ game, onClose }: { game: typeof GAMES[0]; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(16px)", animation: "fadeIn 0.2s ease-out" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          animation: "scaleIn 0.25s ease-out",
          boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 60px ${game.glow}`,
          border: `1px solid ${game.accent}40`,
        }}
      >
        {/* Header with game thumb */}
        <div className="relative h-28 overflow-hidden">
          {game.cover ? (
            <Image src={game.cover} alt={game.title} fill className="object-cover object-top" />
          ) : (
            <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", height: "100%" }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(8,10,20,0.95))" }} />
          <div className="absolute bottom-3 left-4 right-12">
            <h3 className="font-black text-xl text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
              {game.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all"
            style={{ background: "rgba(0,0,0,0.5)", color: "#94a3b8" }}
          >✕</button>
        </div>

        {/* Form */}
        <div className="p-5" style={{ background: "rgba(8,10,20,0.98)" }}>
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
            {(["create","join"] as const).map((m) => (
              <button key={m} id={`modal-tab-${m}`} onClick={() => setMode(m)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={mode === m
                  ? { background: `linear-gradient(135deg, ${game.accent}, #8b5cf6)`, color: "#fff", boxShadow: `0 4px 12px ${game.glow}` }
                  : { color: "#64748b" }
                }
              >
                {m === "create" ? "🏠 สร้างห้อง" : "🚪 เข้าร่วม"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <input
              id="modal-player-name"
              value={name} onChange={(e) => setName(e.target.value)}
              maxLength={20} placeholder="ชื่อเล่น เช่น บอย" autoComplete="off"
              className="w-full rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = game.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${game.glow}40`; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
            />
            {mode === "join" && (
              <input
                id="modal-room-code"
                value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={4} placeholder="ABCD" autoComplete="off"
                className="w-full rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.6em] uppercase text-slate-100 placeholder-slate-700 outline-none transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#8b5cf6"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.2)"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            )}
            {error && (
              <div className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(251,113,133,0.12)", color: "#fb7185" }}>
                ⚠ {error}
              </div>
            )}
            <button
              id="modal-btn-submit" type="button" onClick={handleSubmit} disabled={loading}
              className="w-full py-3.5 rounded-xl font-black text-white transition-all duration-200 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${game.accent}, #8b5cf6)`, boxShadow: `0 8px 24px ${game.glow}` }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 12px 32px ${game.glow}`; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 8px 24px ${game.glow}`; }}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>กำลังโหลด...</span>
                : mode === "create" ? "✨ สร้างห้องใหม่" : "🚀 เข้าร่วมเกม"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
function LauncherContent() {
  const searchParams = useSearchParams();
  const initCode = searchParams.get("room");

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showModal, setShowModal] = useState(!!initCode);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [animKey, setAnimKey] = useState(0); // trigger re-animation on game switch

  const selected = GAMES[selectedIdx];

  function selectGame(idx: number) {
    if (idx === selectedIdx) return;
    setHeroLoaded(false);
    setSelectedIdx(idx);
    setAnimKey(k => k + 1);
  }

  // Parallax-lite: slightly shift background on scroll
  useEffect(() => {
    setHeroLoaded(true);
  }, [selectedIdx]);

  return (
    <div className="relative min-h-dvh flex flex-col overflow-hidden" style={{ userSelect: "none" }}>
      <Particles />

      {/* ── Hero background ── */}
      <div className="absolute inset-0 transition-all duration-700">
        {selected.cover ? (
          <>
            {/* Blurred BG */}
            <Image
              src={selected.cover} alt="" fill
              className="object-cover"
              style={{ opacity: 0.18, filter: "blur(2px)", transform: "scale(1.05)" }}
              priority
            />
            {/* Sharp center image */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative w-full max-w-3xl mx-auto"
                style={{
                  height: "360px",
                  animation: heroLoaded ? "slideUpFade 0.5s ease-out both" : "none",
                }}
              >
                <Image
                  src={selected.cover} alt={selected.title}
                  fill className="object-contain drop-shadow-2xl"
                  style={{ filter: "drop-shadow(0 8px 40px rgba(0,0,0,0.6))" }}
                  priority
                  onLoad={() => setHeroLoaded(true)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: "var(--bg-base)" }} />
        )}

        {/* Dark overlays */}
        <div className="absolute inset-0" style={{
          background: `
            linear-gradient(to bottom, rgba(8,10,20,0.7) 0%, rgba(8,10,20,0.05) 40%, rgba(8,10,20,0.05) 60%, rgba(8,10,20,0.98) 100%),
            linear-gradient(to right, rgba(8,10,20,0.92) 0%, transparent 40%, transparent 60%, rgba(8,10,20,0.92) 100%)
          `
        }} />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 pt-6 pb-2">
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-2 cursor-pointer"
            style={{ animation: "slideUpFade 0.4s ease-out" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-black"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 16px rgba(99,102,241,0.5)" }}
            >S</div>
            <span className="font-black text-lg gradient-text tracking-tight">SanukHub</span>
          </div>
          <div className="hidden md:flex gap-1">
            {["เกม","สื่อ"].map((t, i) => (
              <button key={t}
                className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200"
                style={i === 0
                  ? { background: "rgba(255,255,255,0.1)", color: "#e2e8f0", backdropFilter: "blur(8px)" }
                  : { color: "#475569" }
                }
              >{t}</button>
            ))}
          </div>
        </div>
        <div
          className="text-xs text-slate-600 hidden md:block"
          style={{ animation: "slideUpFade 0.4s ease-out 0.1s both" }}
        >
          สนุกไปด้วยกัน 🎮
        </div>
      </nav>

      {/* ── Side info panel (left) ── */}
      <div
        className="relative z-10 flex-1 flex flex-col justify-end pb-52 px-8"
        key={animKey}
      >
        <div className="max-w-sm" style={{ animation: "slideUpFade 0.45s ease-out 0.05s both" }}>
          {/* Tag badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
            style={{ background: selected.tagBg, color: selected.tagColor, border: `1px solid ${selected.tagColor}40` }}
          >
            {selected.tag}
          </div>

          {/* Genre */}
          <p className="text-slate-400 text-sm mb-3 font-medium">{selected.genre}</p>

          {/* Description */}
          <p className="text-slate-300 text-sm leading-relaxed mb-6 max-w-xs">{selected.description}</p>

          {/* Play button */}
          {selected.available ? (
            <button
              id="btn-play-game"
              onClick={() => setShowModal(true)}
              className="relative group inline-flex items-center gap-3 px-7 py-3.5 rounded-2xl font-black text-lg text-white overflow-hidden transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${selected.accent}, #8b5cf6)`,
                boxShadow: `0 8px 32px ${selected.glow}, 0 4px 16px rgba(0,0,0,0.3)`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(1.03)"; e.currentTarget.style.boxShadow = `0 16px 48px ${selected.glow}, 0 4px 16px rgba(0,0,0,0.4)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 8px 32px ${selected.glow}, 0 4px 16px rgba(0,0,0,0.3)`; }}
            >
              {/* Shimmer sweep */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)", animation: "shimmer 1.5s linear infinite" }} />
              <span className="text-xl">▶</span>
              <span>เล่นเลย</span>
            </button>
          ) : (
            <button disabled
              className="inline-flex items-center gap-3 px-7 py-3.5 rounded-2xl font-black text-lg cursor-not-allowed"
              style={{ background: "rgba(255,255,255,0.05)", color: "#475569", border: "1px solid rgba(255,255,255,0.08)" }}
            >🔒 เร็วๆ นี้</button>
          )}
        </div>
      </div>

      {/* ── Bottom game carousel ── */}
      <div className="relative z-10 absolute bottom-0 left-0 right-0 pb-6 px-6"
        style={{ animation: "slideUpFade 0.5s ease-out 0.15s both" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3 px-1">
          เกมทั้งหมด
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {GAMES.map((game, idx) => {
            const isActive = idx === selectedIdx;
            return (
              <button
                key={game.id}
                id={`game-card-${game.id}`}
                onClick={() => selectGame(idx)}
                className="flex-shrink-0 relative rounded-2xl overflow-hidden transition-all duration-350 group"
                style={{
                  width: "150px",
                  height: "90px",
                  border: `2px solid ${isActive ? game.accent : "rgba(255,255,255,0.06)"}`,
                  boxShadow: isActive ? `0 0 28px ${game.glow}, 0 8px 24px rgba(0,0,0,0.4)` : "0 4px 12px rgba(0,0,0,0.3)",
                  transform: isActive ? "translateY(-6px) scale(1.06)" : "none",
                  transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                {/* Thumbnail */}
                {game.thumb ? (
                  <Image
                    src={game.thumb} alt={game.title} fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    style={{ opacity: game.available ? 1 : 0.25 }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="text-2xl opacity-20">🎮</span>
                    <span className="text-[9px] text-slate-700 font-semibold">เร็วๆ นี้</span>
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 transition-all duration-300"
                  style={{ background: isActive ? "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" : "rgba(0,0,0,0.35)" }}
                />

                {/* Active glow ring */}
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl"
                    style={{ boxShadow: `inset 0 0 0 2px ${game.accent}60` }}
                  />
                )}

                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                  <p className="text-[11px] font-black text-white truncate"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
                  >
                    {game.available ? game.title : "เร็วๆ นี้"}
                  </p>
                </div>

                {/* Active dot */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse-success"
                    style={{ background: game.tagColor, boxShadow: `0 0 8px ${game.tagColor}` }}
                  />
                )}

                {/* Hover shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)" }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && <PlayModal game={selected} onClose={() => setShowModal(false)} />}
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
