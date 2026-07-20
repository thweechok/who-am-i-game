"use client";

import { useState } from "react";
import type { PublicRoomState } from "@/lib/types";
import { startGame, sendAction } from "@/lib/api-client";

/* ── RPG style tokens ─────────────────────────────────────── */
const rpgCard = {
  background: "linear-gradient(180deg, #1c0e04 0%, #0d0700 60%, #1c0e04 100%)",
  border: "2px solid #9a6e10",
  boxShadow:
    "inset 0 1px 0 rgba(255,180,50,0.12), inset 0 -1px 0 rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(154,110,16,0.25)",
  borderRadius: "6px",
} as const;

const rpgBtnPrimary = {
  border: "2px solid #d4a827",
  outline: "1px solid #a07820",
  outlineOffset: "-5px",
  borderRadius: "4px",
  background: "linear-gradient(180deg, #3a2200 0%, #1e1000 40%, #3a2200 100%)",
  boxShadow:
    "inset 0 2px 0 rgba(255,210,80,0.25), inset 0 -2px 0 rgba(0,0,0,0.5), 0 6px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,168,39,0.4), 0 0 20px rgba(212,168,39,0.15)",
  color: "#fde68a",
  textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(255,200,80,0.4)",
  letterSpacing: "0.05em",
} as const;

const rpgBtnGhost = {
  border: "1px solid #5a3a08",
  borderRadius: "4px",
  background: "rgba(0,0,0,0.3)",
  color: "#9a6e10",
} as const;

function PlayerRow({
  player,
  isYou,
  isHost,
}: {
  player: { id: string; name: string; isSpectator?: boolean };
  isYou: boolean;
  isHost: boolean;
}) {
  const initial = player.name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded transition-all"
      style={{
        background: isYou ? "rgba(212,168,39,0.06)" : "rgba(0,0,0,0.2)",
        border: isYou ? "1px solid rgba(212,168,39,0.25)" : "1px solid rgba(154,110,16,0.15)",
        borderRadius: "4px",
      }}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded flex items-center justify-center text-sm font-black flex-shrink-0 relative"
        style={{
          background: isYou
            ? "linear-gradient(135deg,#d4a827,#8b6010)"
            : "rgba(154,110,16,0.15)",
          border: isYou ? "1px solid #d4a827" : "1px solid #3a2208",
          color: isYou ? "#0d0700" : "#9a6e10",
        }}>
        {initial}
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
          style={{ background: "#34d399", boxShadow: "0 0 5px #34d399" }} />
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold truncate block" style={{ color: isYou ? "#fde68a" : "#c8911a" }}>
          {player.name}
        </span>
        <div className="flex gap-1.5 mt-0.5 flex-wrap">
          {isYou && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(212,168,39,0.15)", color: "#d4a827", border: "1px solid rgba(212,168,39,0.3)" }}>คุณ</span>}
          {isHost && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>👑 Host</span>}
          {player.isSpectator && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(148,163,184,0.1)", color: "#64748b", border: "1px solid rgba(148,163,184,0.2)" }}>👁️ ดู</span>}
        </div>
      </div>
    </div>
  );
}

export function Lobby({
  room,
  playerId,
  onRefresh,
}: {
  room: PublicRoomState;
  playerId: string;
  onRefresh: () => void;
}) {
  const amHost = room.hostId === playerId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const activePlayers = room.players.filter(p => !p.isSpectator);
  const canStart = activePlayers.length >= 2;

  async function handleStart() {
    setLoading(true);
    setError("");
    try {
      await startGame(room.code, playerId, "setup");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }

  function copyInvite() {
    const url = `${window.location.origin}/room/${room.code}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/room/${room.code}` : "";

  return (
    <div className="w-full max-w-md animate-slide-up space-y-3">

      {/* ── Room Code Card ── */}
      <div className="p-5" style={rpgCard}>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#9a6e10" }}>
          ⚔️ รหัสห้อง
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 font-mono text-4xl font-black tracking-[0.4em]"
            style={{ color: "#fde68a", textShadow: "0 0 20px rgba(212,168,39,0.4)" }}>
            {room.code}
          </div>
          <button onClick={copyInvite} id="btn-copy-invite"
            className="px-4 py-2 text-sm font-bold transition-all hover:brightness-125"
            style={copied ? {
              ...rpgBtnGhost,
              color: "#34d399",
              border: "1px solid rgba(52,211,153,0.4)",
              background: "rgba(52,211,153,0.05)",
              borderRadius: "4px",
            } : rpgBtnGhost}>
            {copied ? "✓ คัดลอก!" : "📋 คัดลอกลิงก์"}
          </button>
        </div>
        {/* Invite URL hint */}
        <p className="text-[10px] mt-2 truncate" style={{ color: "#5a3a08" }}>
          {inviteUrl || `sanukhub.vercel.app/room/${room.code}`}
        </p>

        {/* Step hint */}
        <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(154,110,16,0.2)" }}>
          <span className="text-[10px] font-bold" style={{ color: "#c8911a" }}>
            📌 แชร์รหัสหรือลิงก์ให้เพื่อนเข้าห้อง
          </span>
        </div>
      </div>

      {/* ── Players Card ── */}
      <div className="p-4" style={rpgCard}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#9a6e10" }}>
            ผู้เล่น
          </span>
          <span className="text-xs font-black font-mono px-2 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.3)", color: "#c8911a", border: "1px solid #5a3a08" }}>
            {activePlayers.length}/6
          </span>
        </div>

        <div className="space-y-2">
          {room.players.map(p => (
            <PlayerRow
              key={p.id}
              player={p}
              isYou={p.id === playerId}
              isHost={p.id === room.hostId}
            />
          ))}

          {/* Empty slots */}
          {activePlayers.length < 2 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded"
              style={{ border: "1px dashed rgba(154,110,16,0.2)", borderRadius: "4px" }}>
              <span className="text-xs" style={{ color: "#4a2e08" }}>
                ⏳ รอผู้เล่นอื่นเข้าร่วม... (ต้องมีอย่างน้อย 2 คน)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Settings (Host only) ── */}
      {amHost && (
        <div className="p-4" style={rpgCard}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "#9a6e10" }}>
            ⚙️ จำกัดคำถามต่อตา
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[3, 5, 8, 0].map((n) => {
              const label = n === 0 ? "∞" : `${n}`;
              const active = (room.maxQuestionsPerTurn ?? 5) === n;
              return (
                <button key={n} id={`btn-max-q-${n}`}
                  onClick={async () => {
                    try {
                      await sendAction(room.code, playerId, { type: "setMaxQuestions", value: n });
                      onRefresh();
                    } catch { /* ignore */ }
                  }}
                  className="py-2.5 text-sm font-black transition-all hover:brightness-125"
                  style={active ? rpgBtnPrimary : rpgBtnGhost}>
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] mt-2" style={{ color: "#5a3a08" }}>
            {(room.maxQuestionsPerTurn ?? 5) === 0
              ? "ไม่จำกัดจำนวนคำถาม"
              : `ถามได้สูงสุด ${room.maxQuestionsPerTurn ?? 5} ข้อ แล้วต้องทายหรือผ่าน`}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 text-sm font-semibold rounded"
          style={{ background: "rgba(251,113,133,0.1)", color: "#fb7185", border: "1px solid rgba(251,113,133,0.25)" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Start / Wait ── */}
      {amHost ? (
        <div className="p-4 space-y-3" style={rpgCard}>
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full"
                  style={{ background: i < activePlayers.length ? "#d4a827" : "rgba(154,110,16,0.2)", boxShadow: i < activePlayers.length ? "0 0 4px #d4a827" : "none" }} />
              ))}
            </div>
            <span className="text-xs" style={{ color: "#9a6e10" }}>
              {activePlayers.length} / 6 คน
            </span>
          </div>
          <button
            id="btn-start-game"
            onClick={handleStart}
            disabled={loading || !canStart}
            className="w-full py-4 text-base font-black tracking-wider transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            style={rpgBtnPrimary}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-amber-900 border-t-amber-300 animate-spin" />
                กำลังเริ่ม...
              </span>
            ) : !canStart ? (
              `⏳ รออีก ${2 - activePlayers.length} คน`
            ) : (
              "⚔️ เริ่มเกม!"
            )}
          </button>
          {canStart && (
            <p className="text-[10px] text-center" style={{ color: "#5a3a08" }}>
              กด "เริ่มเกม" แล้วเลือกหัวข้อในขั้นตอนถัดไป
            </p>
          )}
        </div>
      ) : (
        <div className="p-4 text-center" style={rpgCard}>
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#d4a827" }} />
            <span className="text-sm font-bold" style={{ color: "#c8911a" }}>รอ Host เริ่มเกม...</span>
          </div>
        </div>
      )}
    </div>
  );
}
