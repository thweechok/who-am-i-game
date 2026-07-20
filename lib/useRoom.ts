"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchRoom } from "./api-client";
import type { PublicRoomState } from "./types";

// Polling intervals chosen to stay within Upstash free tier (~10k cmd/day):
// - Fast (playing): need responsiveness on whose turn → 3s
// - Slow (lobby/setup/ended): low urgency → 10s (saves ~3x commands)
const FAST_POLL_MS = 3000;
const SLOW_POLL_MS = 10000;

// Show a "reconnecting" banner after this many consecutive silent errors
const ERROR_THRESHOLD = 3;

export function useRoom(code: string, playerId: string) {
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [loading, setLoading] = useState(true);

  const versionRef = useRef(0);
  const stoppedRef = useRef(false);
  const roomStatusRef = useRef<string>("lobby");
  const consecutiveErrorsRef = useRef(0);
  // Holds the timeout ID so we can cancel it on unmount
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    if (stoppedRef.current) return;
    try {
      const data = await fetchRoom(code, playerId, versionRef.current);
      if (data) {
        versionRef.current = data.version;
        roomStatusRef.current = data.status;
        setRoom(data);
      }
      // Reset error state on any successful response (even 304)
      consecutiveErrorsRef.current = 0;
      setReconnecting(false);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "error";
      if (msg === "ROOM_NOT_FOUND") {
        setError("ห้องนี้ไม่อยู่แล้ว หรือหมดอายุ");
        stoppedRef.current = true;
        return;
      }
      // Transient network error: count consecutive failures
      consecutiveErrorsRef.current += 1;
      if (consecutiveErrorsRef.current >= ERROR_THRESHOLD) {
        setReconnecting(true);
      }
      // Keep last known state — don't overwrite room
    } finally {
      setLoading(false);
      scheduleNext();
    }
  }, [code, playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Schedule the next poll with adaptive interval.
   *  Uses recursive setTimeout instead of setInterval to guarantee
   *  no overlap: next poll only starts AFTER the previous one completes. */
  function scheduleNext() {
    if (stoppedRef.current) return;
    const status = roomStatusRef.current;
    const ms = status === "playing" ? FAST_POLL_MS : SLOW_POLL_MS;
    timeoutRef.current = setTimeout(poll, ms);
  }

  // Start polling on mount; restart when room status changes (to re-pick interval)
  useEffect(() => {
    stoppedRef.current = false;
    consecutiveErrorsRef.current = 0;
    // Cancel any pending timeout before starting a new poll cycle (prevents double-poll on status change)
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Kick off immediately
    poll();

    return () => {
      stoppedRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [poll, room?.status]); // re-run when status changes so scheduleNext picks the right interval

  // Pause polling when tab is hidden → huge savings on idle background tabs
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible" && !stoppedRef.current) {
        // Cancel any pending timeout and poll immediately on return
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        poll();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [poll]);

  /** Force an immediate refresh after a mutation. */
  const refresh = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    return poll();
  }, [poll]);

  return { room, error, loading, reconnecting, refresh };
}
