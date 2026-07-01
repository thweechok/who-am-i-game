"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchRoom } from "./api-client";
import type { PublicRoomState } from "./types";

const POLL_MS = 2500;

export function useRoom(code: string, playerId: string) {
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const versionRef = useRef(0);
  const stoppedRef = useRef(false);

  const poll = useCallback(async () => {
    if (stoppedRef.current) return;
    try {
      const data = await fetchRoom(code, playerId, versionRef.current);
      if (data) {
        versionRef.current = data.version;
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

  useEffect(() => {
    stoppedRef.current = false;
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stoppedRef.current = true;
      clearInterval(id);
    };
  }, [poll]);

  /** Force an immediate refresh after a mutation. */
  const refresh = useCallback(() => {
    return poll();
  }, [poll]);

  return { room, error, loading, refresh };
}
