"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchRoom } from "./api-client";
import type { PublicRoomState } from "./types";

// Polling intervals chosen to stay within Upstash free tier (~10k cmd/day):
// - Fast (playing): need responsiveness on whose turn → 3s
// - Slow (lobby/setup/ended): low urgency → 10s (saves ~3x commands)
const FAST_POLL_MS = 3000;
const SLOW_POLL_MS = 10000;

export function useRoom(code: string, playerId: string) {
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const versionRef = useRef(0);
  const stoppedRef = useRef(false);
  const roomStatusRef = useRef<string>("lobby");

  const poll = useCallback(async () => {
    if (stoppedRef.current) return;
    try {
      const data = await fetchRoom(code, playerId, versionRef.current);
      if (data) {
        versionRef.current = data.version;
        roomStatusRef.current = data.status;
        setRoom(data);
      }
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "error";
      if (msg === "ROOM_NOT_FOUND") {
        setError("ห้องนี้ไม่อยู่แล้ว หรือหมดอายุ");
        stoppedRef.current = true;
        return;
      }
      // transient: keep last state, don't overwrite
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [code, playerId]);

  // Main polling loop with adaptive interval + pause when tab hidden
  useEffect(() => {
    stoppedRef.current = false;
    poll();

    let intervalId: ReturnType<typeof setInterval>;
    function reschedule() {
      if (intervalId) clearInterval(intervalId);
      const status = roomStatusRef.current;
      const ms =
        status === "playing" ? FAST_POLL_MS : SLOW_POLL_MS;
      intervalId = setInterval(poll, ms);
    }
    reschedule();

    // re-schedule whenever status changes (room triggers re-render)
    return () => {
      stoppedRef.current = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [poll, room?.status]);

  // Pause polling when tab is hidden → huge savings on idle background tabs
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible" && !stoppedRef.current) {
        poll(); // immediate refresh on return
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [poll]);

  /** Force an immediate refresh after a mutation. */
  const refresh = useCallback(() => {
    return poll();
  }, [poll]);

  return { room, error, loading, refresh };
}
