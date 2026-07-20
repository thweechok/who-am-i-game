"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoom } from "@/lib/useRoom";
import { Lobby } from "./phases/Lobby";
import { Setup } from "./phases/Setup";
import { Playing } from "./phases/Playing";
import { Ended } from "./phases/Ended";

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  // read once during first render (lazy initializers — no setState-in-effect)
  const [session] = useState(() => {
    if (typeof window === "undefined") return { id: null, name: "" };
    return {
      id: sessionStorage.getItem("playerId"),
      name: sessionStorage.getItem("playerName") ?? "",
    };
  });

  useEffect(() => {
    if (!session.id) {
      // Redirect back to home with room code pre-filled
      router.replace(`/?room=${code}`);
    }
  }, [session.id, code, router]);

  if (!session.id) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-slate-500 animate-pulse">กำลังโหลด...</p>
      </main>
    );
  }

  return (
    <RoomBody code={code} playerId={session.id} playerName={session.name} />
  );
}

function RoomBody({
  code,
  playerId,
  playerName,
}: {
  code: string;
  playerId: string;
  playerName: string;
}) {
  const { room, error, loading, reconnecting, refresh } = useRoom(code, playerId);

  if (loading && !room) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin"
            style={{ boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}
          />
          <p className="text-slate-400 text-sm">กำลังเข้าห้อง {code}...</p>
        </div>
      </main>
    );
  }

  if (error && !room) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <div
          className="rounded-2xl px-8 py-6 text-center animate-scale-in"
          style={{ background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.2)" }}
        >
          <p className="text-4xl mb-3">😕</p>
          <p className="text-rose-400 font-medium">{error}</p>
        </div>
        <button
          onClick={() => window.location.assign("/")}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
          }}
        >
          กลับหน้าหลัก
        </button>
      </main>
    );
  }

  if (!room) return null;

  const statusLabel: Record<string, string> = {
    lobby: "รอผู้เล่น",
    setup: "เตรียมเกม",
    playing: `รอบที่ ${room.round}`,
    ended: `จบรอบที่ ${room.round}`,
  };

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-6">
      {/* Reconnecting banner */}
      {reconnecting && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 animate-slide-up"
          style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-blink" />
          กำลังเชื่อมต่อใหม่...
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-2xl mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black gradient-text">WHO AM I?</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ห้อง{" "}
            <span className="font-mono font-bold text-slate-300">{room.code}</span>
            {" "}·{" "}{playerName}
            {" "}·{" "}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background:
                  room.status === "playing"
                    ? "rgba(52,211,153,0.12)"
                    : "rgba(129,140,248,0.12)",
                color:
                  room.status === "playing" ? "#34d399" : "#818cf8",
              }}
            >
              {statusLabel[room.status] ?? room.status}
            </span>
          </p>
        </div>
        <button
          onClick={() => window.location.assign("/")}
          className="text-xs text-slate-600 hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          ออก
        </button>
      </div>

      {room.status === "lobby" && (
        <Lobby room={room} playerId={playerId} onRefresh={refresh} />
      )}
      {room.status === "setup" && (
        <Setup room={room} playerId={playerId} onRefresh={refresh} />
      )}
      {room.status === "playing" && (
        <Playing room={room} playerId={playerId} onRefresh={refresh} />
      )}
      {room.status === "ended" && (
        <Ended room={room} playerId={playerId} onRefresh={refresh} />
      )}
    </main>
  );
}
