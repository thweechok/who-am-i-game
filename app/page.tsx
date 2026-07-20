"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createRoom, joinRoom } from "@/lib/api-client";

// ─── Game catalogue ────────────────────────────────────────────────────────
const GAMES = [
  {
    id: "who-am-i",
    title: "WHO AM I?",
    titleTH: "ฉันคือใคร?",
    genre: "ปาร์ตี้ · ทายคำ · 3-6 คน",
    description:
      "คำตอบถูกซ่อนไว้บนหัวคุณ ถามได้แค่ yes/no — คุณจะทายออกไหมว่าคุณคือใคร?",
    cover: "/who-am-i-cover.png",
    thumb: "/who-am-i-thumb.png",
    available: true,
    accentColor: "#6366f1",
    glowColor: "rgba(99,102,241,0.35)",
  },
  {
    id: "coming-soon-1",
    title: "???",
    titleTH: "เร็วๆ นี้",
    genre: "เกมใหม่กำลังมา",
    description: "เกมใหม่จาก SanukHub กำลังจะมาเร็วๆ นี้...",
    cover: null,
    thumb: null,
    available: false,
    accentColor: "#475569",
    glowColor: "rgba(71,85,105,0.2)",
  },
  {
    id: "coming-soon-2",
    title: "???",
    titleTH: "เร็วๆ นี้",
    genre: "เกมใหม่กำลังมา",
    description: "เกมใหม่จาก SanukHub กำลังจะมาเร็วๆ นี้...",
    cover: null,
    thumb: null,
    available: false,
    accentColor: "#475569",
    glowColor: "rgba(71,85,105,0.2)",
  },
];

// ─── Join/Create modal ─────────────────────────────────────────────────────
function PlayModal({ onClose }: { onClose: () => void }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 animate-scale-in"
        style={{
          background: "rgba(14,16,34,0.98)",
          border: "1px solid rgba(99,102,241,0.3)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 40px rgba(99,102,241,0.15)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg gradient-text">เล่น WHO AM I?</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["create","join"] as const).map((m) => (
            <button
              key={m}
              id={`modal-tab-${m}`}
              onClick={() => setMode(m)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
              style={
                mode === m
                  ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 4px 12px rgba(99,102,241,0.4)" }
                  : { color: "#64748b" }
              }
            >
              {m === "create" ? "🏠 สร้างห้อง" : "🚪 เข้าร่วม"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            id="modal-player-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="ชื่อเล่น เช่น บอย"
            autoComplete="off"
            className="w-full rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            onFocus={(e) => { e.currentTarget.style.borderColor="#6366f1"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(99,102,241,0.2)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow="none"; }}
          />
          {mode === "join" && (
            <input
              id="modal-room-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="รหัส เช่น ABCD"
              autoComplete="off"
              className="w-full rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.6em] uppercase text-slate-100 placeholder-slate-700 outline-none transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor="#8b5cf6"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(139,92,246,0.2)"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow="none"; }}
            />
          )}
          {error && (
            <div className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(251,113,133,0.12)", color: "#fb7185" }}>
              ⚠ {error}
            </div>
          )}
          <button
            id="modal-btn-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all duration-200 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform="translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform=""; }}
          >
            {loading
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>กำลังโหลด...</span>
              : mode === "create" ? "✨ สร้างห้องใหม่" : "🚀 เข้าร่วมเกม"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main launcher ─────────────────────────────────────────────────────────
function LauncherContent() {
  const searchParams = useSearchParams();
  const initCode = searchParams.get("room");

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showModal, setShowModal] = useState(!!initCode);
  const selected = GAMES[selectedIdx];

  return (
    <div className="relative min-h-dvh flex flex-col overflow-hidden select-none">

      {/* ── Hero background ── */}
      <div className="absolute inset-0 transition-all duration-700">
        {selected.cover ? (
          <Image
            src={selected.cover}
            alt={selected.title}
            fill
            className="object-cover transition-opacity duration-700"
            style={{ opacity: 0.35 }}
            priority
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "var(--bg-base)" }} />
        )}
        {/* gradient overlay */}
        <div className="absolute inset-0"
          style={{
            background: `linear-gradient(
              to right,
              rgba(8,10,20,0.97) 0%,
              rgba(8,10,20,0.75) 45%,
              rgba(8,10,20,0.2) 100%
            ),
            linear-gradient(
              to top,
              rgba(8,10,20,1) 0%,
              transparent 60%
            )`
          }}
        />
      </div>

      {/* ── Top navigation ── */}
      <nav className="relative z-10 flex items-center justify-between px-10 py-5">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <span className="font-black text-xl gradient-text tracking-tight">SanukHub</span>
          {/* Nav tabs */}
          <div className="flex items-center gap-1 hidden md:flex">
            {["เกม", "สื่อ"].map((t, i) => (
              <button key={t}
                className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150"
                style={i === 0
                  ? { background: "rgba(255,255,255,0.1)", color: "#e2e8f0" }
                  : { color: "#64748b" }
                }
              >{t}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span className="text-sm hidden md:block">สนุกไปด้วยกัน 🎮</span>
        </div>
      </nav>

      {/* ── Hero content ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pt-4 pb-36 md:pb-40">
        <div className="max-w-lg animate-slide-up">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{
              background: `rgba(${selected.available ? "99,102,241" : "71,85,105"},0.15)`,
              border: `1px solid rgba(${selected.available ? "99,102,241" : "71,85,105"},0.3)`,
              color: selected.available ? "#818cf8" : "#64748b",
            }}
          >
            {selected.available ? "🟢 พร้อมเล่น" : "🔒 เร็วๆ นี้"}
          </div>

          <h1 className="text-6xl md:text-7xl font-black leading-none mb-1"
            style={{
              color: "#fff",
              textShadow: selected.available ? `0 0 60px ${selected.glowColor}` : "none",
            }}
          >
            {selected.title}
          </h1>
          {selected.titleTH && (
            <p className="text-xl font-bold mb-4" style={{ color: selected.accentColor }}>
              {selected.titleTH}
            </p>
          )}
          <p className="text-sm text-slate-500 mb-3 font-medium">{selected.genre}</p>
          <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-md">
            {selected.description}
          </p>

          {selected.available ? (
            <button
              id="btn-play-game"
              onClick={() => setShowModal(true)}
              className="relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg text-white transition-all duration-200 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${selected.accentColor}, #8b5cf6)`,
                boxShadow: `0 12px 40px ${selected.glowColor}, 0 4px 16px rgba(0,0,0,0.4)`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
            >
              <span className="text-2xl">▶</span>
              เล่นเลย
            </button>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg cursor-not-allowed"
              style={{ background: "rgba(255,255,255,0.05)", color: "#475569", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              🔒 เร็วๆ นี้
            </button>
          )}
        </div>
      </div>

      {/* ── Game carousel (bottom) ── */}
      <div className="relative z-10 absolute bottom-0 left-0 right-0 pb-8 px-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3 px-2">
          เกมทั้งหมด
        </p>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {GAMES.map((game, idx) => {
            const isActive = idx === selectedIdx;
            return (
              <button
                key={game.id}
                id={`game-card-${game.id}`}
                onClick={() => setSelectedIdx(idx)}
                className="flex-shrink-0 relative rounded-2xl overflow-hidden transition-all duration-300 group"
                style={{
                  width: "140px",
                  height: "80px",
                  border: isActive
                    ? `2px solid ${game.accentColor}`
                    : "2px solid rgba(255,255,255,0.07)",
                  boxShadow: isActive ? `0 0 24px ${game.glowColor}` : "none",
                  transform: isActive ? "translateY(-4px) scale(1.05)" : "none",
                }}
              >
                {game.thumb ? (
                  <Image
                    src={game.thumb}
                    alt={game.title}
                    fill
                    className="object-cover transition-all duration-300 group-hover:scale-110"
                    style={{ opacity: game.available ? 0.9 : 0.3 }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <span className="text-3xl opacity-30">🎮</span>
                  </div>
                )}

                {/* overlay */}
                <div className="absolute inset-0"
                  style={{
                    background: isActive
                      ? "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)"
                      : "rgba(0,0,0,0.4)",
                  }}
                />

                {/* title */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[10px] font-bold text-white leading-tight truncate">
                    {game.available ? game.title : "เร็วๆ นี้"}
                  </p>
                </div>

                {/* active indicator */}
                {isActive && (
                  <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: game.accentColor, boxShadow: `0 0 6px ${game.accentColor}` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && <PlayModal onClose={() => setShowModal(false)} />}
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
