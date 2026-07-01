"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom, joinRoom } from "@/lib/api-client";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("กรุณาใส่ชื่อ");
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
        sessionStorage.setItem("playerName", name);
        router.push(`/room/${c}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 bg-gradient-to-b from-indigo-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            WHO AM I?
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            เกมทายตัวตน — ถาม yes/no วนกันไปจนรู้ว่าคำตอบบนหัวคุณคืออะไร
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* mode tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-xl bg-zinc-100 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`py-2 rounded-lg text-sm font-medium transition ${
                mode === "create"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-950 dark:text-indigo-400"
                  : "text-zinc-500"
              }`}
            >
              สร้างห้อง
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className={`py-2 rounded-lg text-sm font-medium transition ${
                mode === "join"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-950 dark:text-indigo-400"
                  : "text-zinc-500"
              }`}
            >
              เข้าร่วม
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                ชื่อเล่น
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="เช่น บอย"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>

            {mode === "join" && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  รหัสห้อง
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  placeholder="ABCD"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-center text-2xl font-mono tracking-[0.5em] uppercase text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading
                ? "กำลังโหลด..."
                : mode === "create"
                ? "สร้างห้องใหม่"
                : "เข้าร่วมเกม"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          รองรับ 3-6 คนต่อห้อง · ทดสอบได้โดยเปิดหลายแท็บ
        </p>
      </div>
    </main>
  );
}
