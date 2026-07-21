"use client";

import { useState } from "react";
import type { PublicRoomState } from "@/lib/types";
import { startGame, sendAction } from "@/lib/api-client";

const lobbyStyles = `
  @keyframes slideUpFade {
    0% { opacity: 0; transform: translateY(15px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes popIn {
    0% { opacity: 0; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes bounceCute {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  .animate-stagger-1 { animation: slideUpFade 0.5s ease-out 0.1s both; }
  .animate-stagger-2 { animation: slideUpFade 0.5s ease-out 0.2s both; }
  .animate-stagger-3 { animation: slideUpFade 0.5s ease-out 0.3s both; }
  
  .player-join {
    animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }
  
  .waiting-bounce {
    animation: bounceCute 1s ease-in-out infinite;
  }
`;

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E0E0E0",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  borderRadius: "16px",
};

const colors = {
  primary: "#FF8C42",
  secondary: "#4DACF7",
  success: "#51CF66",
  danger: "#FF6B6B",
  text: "#2D3436",
  subtitle: "#636E72",
};

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
  
  const avatarColors = [
    "#FF8C42", "#4DACF7", "#51CF66", "#FF6B6B", "#A55EEA", "#FD9644"
  ];
  const charCode = initial.charCodeAt(0) || 0;
  const avatarBg = avatarColors[charCode % avatarColors.length];

  return (
    <div className="flex items-center gap-3 px-4 py-3 player-join mb-2"
      style={{
        background: "#FFFFFF",
        border: isYou ? `2px solid ${colors.primary}` : "1px solid #E0E0E0",
        borderRadius: "12px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
      }}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black flex-shrink-0 relative text-lg"
        style={{ background: avatarBg }}>
        {initial}
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
          style={{ background: colors.success }} />
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-base font-bold truncate" style={{ color: colors.text }}>
          {player.name}
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {isYou && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" 
              style={{ background: `\${colors.primary}22`, color: colors.primary }}>
              (คุณ)
            </span>
          )}
          {isHost && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" 
              style={{ background: "#FFF3CD", color: "#856404" }}>
              👑 Host
            </span>
          )}
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
  const spectatorPlayers = room.players.filter(p => p.isSpectator);
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
    const url = `\${window.location.origin}/room/\${room.code}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <style>{lobbyStyles}</style>
      
      {/* Cartoon Banner for Room Code */}
      <div className="flex flex-col items-center justify-center mb-8 animate-stagger-1">
        <div className="inline-block relative">
          <div className="absolute inset-0 bg-black rounded-[20px] translate-y-2 opacity-10"></div>
          <div className="relative px-8 py-4 rounded-[20px] flex flex-col items-center justify-center text-center" 
            style={{ background: colors.primary, boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.15)" }}>
            <span className="text-white/90 text-sm font-bold uppercase tracking-wider mb-1">รหัสห้องของคุณ</span>
            <div className="text-white text-5xl font-black tracking-widest" style={{ textShadow: "0 4px 0 rgba(0,0,0,0.15)" }}>
              {room.code}
            </div>
          </div>
        </div>
        
        <button onClick={copyInvite} id="btn-copy-invite"
          className="mt-4 px-6 py-2.5 rounded-full font-bold text-white transition-transform active:scale-95 flex items-center gap-2 shadow-sm"
          style={{ 
            background: copied ? colors.success : colors.secondary,
            boxShadow: `0 4px 0 \${copied ? "#38B000" : "#1971C2"}`,
            marginBottom: "4px"
          }}>
          {copied ? "✓ คัดลอกสำเร็จ!" : "🔗 คัดลอกลิงก์เชิญเพื่อน"}
        </button>
      </div>

      <div className="grid md:grid-cols-[1fr_1fr] gap-6">
        
        {/* ── Left Column - Players ── */}
        <div className="flex flex-col gap-6">
          <div className="p-5 animate-stagger-2" style={cardStyle}>
            <div className="flex items-center justify-between mb-4 pb-2" style={{ borderBottom: "2px dashed #E0E0E0" }}>
              <h2 className="text-xl font-black" style={{ color: colors.text }}>ผู้เล่น</h2>
              <span className="text-sm font-bold px-3 py-1 rounded-full" 
                style={{ background: "#F1F3F5", color: colors.subtitle }}>
                {activePlayers.length}/6
              </span>
            </div>

            <div className="space-y-1 min-h-[200px]">
              {activePlayers.map(p => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  isYou={p.id === playerId}
                  isHost={p.id === room.hostId}
                />
              ))}

              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 6 - activePlayers.length) }).map((_, i) => (
                <div key={`empty-\${i}`} className="flex items-center gap-3 px-4 py-3 mb-2 rounded-[12px]"
                  style={{ border: "2px dashed #E0E0E0", background: "#F8F9FA" }}>
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <span className="text-sm font-bold text-gray-400">รอผู้เล่น...</span>
                </div>
              ))}
            </div>
          </div>

          {/* Spectators */}
          {spectatorPlayers.length > 0 && (
            <div className="p-5 animate-stagger-2" style={cardStyle}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">👁️</span>
                <h3 className="font-bold" style={{ color: colors.subtitle }}>คนดู ({spectatorPlayers.length})</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {spectatorPlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-[8px]" style={{ background: "#F8F9FA", border: "1px solid #E0E0E0" }}>
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-gray-600 truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column - Settings (Host only) / Wait (Guest) ── */}
        <div className="flex flex-col gap-6">
          {amHost ? (
            <>
              <div className="p-5 animate-stagger-3" style={cardStyle}>
                <h2 className="text-xl font-black mb-4 pb-2" style={{ color: colors.text, borderBottom: "2px dashed #E0E0E0" }}>
                  ⚙️ ตั้งค่าห้อง
                </h2>
                
                <div className="mb-2">
                  <p className="font-bold mb-3" style={{ color: colors.subtitle }}>จำนวนคำถามสูงสุดต่อตา</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[3, 5, 8, 0].map((n) => {
                      const label = n === 0 ? "∞" : `\${n}`;
                      const active = (room.maxQuestionsPerTurn ?? 5) === n;
                      return (
                        <button key={n} id={`btn-max-q-\${n}`}
                          onClick={async () => {
                            try {
                              await sendAction(room.code, playerId, { type: "setMaxQuestions", value: n });
                              onRefresh();
                            } catch { /* ignore */ }
                          }}
                          className="py-3 rounded-[12px] text-lg font-black transition-all active:scale-95"
                          style={{
                            background: active ? colors.primary : "#F1F3F5",
                            color: active ? "#FFFFFF" : colors.subtitle,
                            boxShadow: active ? "0 4px 0 #D97A3B" : "0 4px 0 #DEE2E6",
                            marginBottom: "4px"
                          }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 text-sm font-bold rounded-[12px]"
                  style={{ background: "#FFE3E3", color: colors.danger, border: "2px solid #FFC9C9" }}>
                  ⚠️ {error}
                </div>
              )}

              <div className="p-5 animate-stagger-3 flex flex-col gap-4" style={cardStyle}>
                <button
                  id="btn-start-game"
                  onClick={handleStart}
                  disabled={loading || !canStart}
                  className="w-full py-5 rounded-[16px] text-2xl font-black transition-transform active:scale-95 disabled:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  style={{
                    background: !canStart ? "#CED4DA" : `linear-gradient(180deg, #FFD166 0%, \${colors.primary} 100%)`,
                    boxShadow: !canStart ? "0 6px 0 #ADB5BD" : "0 6px 0 #E85D04",
                    marginBottom: "6px"
                  }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-6 h-6 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                      กำลังเริ่ม...
                    </span>
                  ) : !canStart ? (
                    `รอผู้เล่นอีก \${2 - activePlayers.length} คน...`
                  ) : (
                    "เริ่มเกม! 🎮"
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 h-full min-h-[300px] flex flex-col items-center justify-center animate-stagger-3 text-center" style={cardStyle}>
              <div className="text-6xl mb-4 waiting-bounce">🕹️</div>
              <h2 className="text-2xl font-black mb-2" style={{ color: colors.primary }}>
                รอ Host เริ่มเกม...
              </h2>
              <p className="font-bold" style={{ color: colors.subtitle }}>
                เตรียมตัวให้พร้อม!
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

