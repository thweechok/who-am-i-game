"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createRoom, joinRoom } from "@/lib/api-client";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill room code + switch to join mode when coming from a direct URL
  useEffect(() => {
    const roomParam = searchParams.get("room");
    if (roomParam) {
      setCode(roomParam.toUpperCase());
      setMode("join");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("กรุณาใส่ชื่อเล่น");
      return;
    }
    setLoading(true);
    try {
      if (mode === "create") {
        const res = await createRoom(name);
        sessionStorage.setItem("playerId", res.playerId);
        sessionStorage.setItem("playerName", res.playerName);
        router.push(`/room/${res.code}`);
      } else {
        const c = code.trim().toUpperCase();
        if (!c) {
          setError("กรุณาใส่รหัสห้อง");
          setLoading(false);
          return;
        }
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
    <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 overflow-hidden">
      {/* Ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #38bdf8, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 animate-float"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 0 40px rgba(99,102,241,0.45)",
            }}
          >
            <span className="text-4xl select-none">❓</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight gradient-text">
            WHO AM I?
          </h1>
          <p className="mt-3 text-slate-400 text-base">
            เกมทายตัวตน — ถาม yes/no วนกันไปจนรู้ว่าคำตอบบนหัวคุณคืออะไร
          </p>
        </div>

        {/* Card */}
        <div
          className="glass-md rounded-2xl p-7"
          style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}
        >
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 mb-7 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {(["create", "join"] as const).map((m) => (
              <button
                key={m}
                type="button"
                id={`tab-${m}`}
                onClick={() => setMode(m)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={
                  mode === m
                    ? {
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        color: "#fff",
                        boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
                      }
                    : { color: "#64748b" }
                }
              >
                {m === "create" ? "🏠 สร้างห้อง" : "🚪 เข้าร่วม"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="player-name"
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
              >
                ชื่อเล่น
              </label>
              <input
                id="player-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="เช่น บอย"
                autoComplete="off"
                className="w-full rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 transition-all duration-200 outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.2)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Room Code (join mode) */}
            {mode === "join" && (
              <div className="animate-slide-up">
                <label
                  htmlFor="room-code"
                  className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
                >
                  รหัสห้อง
                </label>
                <input
                  id="room-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  placeholder="ABCD"
                  autoComplete="off"
                  className="w-full rounded-xl px-4 py-3 text-center text-3xl font-mono tracking-[0.6em] uppercase text-slate-100 placeholder-slate-700 transition-all duration-200 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#8b5cf6";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.2)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm font-medium animate-slide-up"
                style={{ background: "rgba(251,113,133,0.12)", color: "#fb7185", border: "1px solid rgba(251,113,133,0.2)" }}
              >
                ⚠ {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-submit"
              type="submit"
              disabled={loading}
              className="relative w-full py-3.5 rounded-xl font-bold text-white text-base transition-all duration-200 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                boxShadow: loading ? "none" : "0 8px 24px rgba(99,102,241,0.4)",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  กำลังโหลด...
                </span>
              ) : mode === "create" ? (
                "✨ สร้างห้องใหม่"
              ) : (
                "🚀 เข้าร่วมเกม"
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-slate-600">
          รองรับ 3–6 คนต่อห้อง · ทดสอบได้โดยเปิดหลายแท็บ
        </p>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
