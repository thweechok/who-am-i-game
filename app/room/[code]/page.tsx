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
      router.replace(`/?room=${code}`);
    }
  }, [session.id, code, router]);

  if (!session.id) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">กำลังโหลด...</p>
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
  const { room, error, loading, refresh } = useRoom(code, playerId);

  if (loading && !room) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">กำลังเข้าห้อง {code}...</p>
      </main>
    );
  }

  if (error && !room) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.assign("/")}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
        >
          กลับหน้าหลัก
        </button>
      </main>
    );
  }

  if (!room) return null;

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8">
      {/* header */}
      <div className="w-full max-w-2xl mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            WHO AM I?
          </h1>
          <p className="text-sm text-zinc-500">
            ห้อง {room.code} · {playerName}
          </p>
        </div>
        <button
          onClick={() => window.location.assign("/")}
          className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
