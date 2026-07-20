import type {
  RoomState,
  Player,
  PublicRoomState,
  ActionPayload,
} from "./types";

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;
export const SCORE_BOARD = [3, 2, 1]; // 1st, 2nd, 3rd
export const CHAT_MAX = 100; // keep last N messages

export function genId() {
  return (
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-4)
  );
}

export function emptyRoom(code: string, host: Player): RoomState {
  return {
    code,
    hostId: host.id,
    status: "lobby",
    version: 1,
    setupMode: "manual",
    topic: "",
    players: [host],
    answers: {},
    turnOrder: [],
    currentTurnIdx: 0,
    round: 0,
    chat: [
      {
        id: genId(),
        fromId: null,
        fromName: "ระบบ",
        type: "system",
        text: `ห้อง ${code} สร้างแล้ว — แชร์รหัสนี้ให้เพื่อน`,
        ts: Date.now(),
      },
    ],
    finishers: [],
    waitingForAnswer: false,
    difficulty: "medium",
    createdAt: Date.now(),
  };
}

export function newPlayer(name: string): Player {
  const trimmed = name.trim().slice(0, 20) || "ผู้เล่น";
  return {
    id: genId(),
    name: trimmed,
    score: 0,
    guessedCorrectly: false,
    guessedThisRound: false,
    lastSeen: Date.now(),
  };
}

export function findPlayer(room: RoomState, playerId: string) {
  return room.players.find((p) => p.id === playerId) ?? null;
}

export function isHost(room: RoomState, playerId: string) {
  return room.hostId === playerId;
}

/** Strip own answer; keep others' answers. Used before sending to a client. */
export function toPublic(room: RoomState, viewerId: string): PublicRoomState {
  const others: Record<string, string> = {};
  for (const [pid, ans] of Object.entries(room.answers)) {
    if (pid !== viewerId) others[pid] = ans;
  }
  const currentTurnId =
    room.turnOrder[room.currentTurnIdx % Math.max(room.turnOrder.length, 1)] ??
    null;
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    version: room.version,
    setupMode: room.setupMode,
    topic: room.topic,
    players: room.players,
    answers: others,
    myAnswer: room.answers[viewerId] ?? null,
    turnOrder: room.turnOrder,
    currentTurnIdx: room.currentTurnIdx,
    currentTurnId,
    round: room.round,
    chat: room.chat,
    finishers: room.finishers,
    waitingForAnswer: room.waitingForAnswer ?? false,
    difficulty: room.difficulty ?? "medium",
    createdAt: room.createdAt,
  };
}

function pushChat(room: RoomState, msg: Omit<RoomState["chat"][number], "id" | "ts">) {
  room.chat.push({ ...msg, id: genId(), ts: Date.now() });
  if (room.chat.length > CHAT_MAX) {
    room.chat = room.chat.slice(-CHAT_MAX);
  }
}

/** Add a player to the room if allowed. Returns updated (mutated) room. */
export function addPlayer(room: RoomState, player: Player): { ok: boolean; error?: string } {
  if (room.status !== "lobby") {
    return { ok: false, error: "เกมเริ่มแล้ว ไม่สามารถเข้าร่วมได้" };
  }
  if (room.players.length >= MAX_PLAYERS) {
    return { ok: false, error: "ห้องเต็มแล้ว" };
  }
  if (room.players.some((p) => p.name.toLowerCase() === player.name.toLowerCase())) {
    return { ok: false, error: "มีชื่อนี้ในห้องแล้ว" };
  }
  room.players.push(player);
  pushChat(room, {
    fromId: null,
    fromName: "ระบบ",
    type: "system",
    text: `${player.name} เข้าร่วมห้อง`,
  });
  return { ok: true };
}

/** Begin setup phase: status -> setup, assign turn order later at playing. */
export function beginSetup(room: RoomState): { ok: boolean; error?: string } {
  if (room.status !== "lobby") return { ok: false, error: "ไม่สามารถเริ่มได้" };
  if (room.players.length < MIN_PLAYERS) {
    return { ok: false, error: `ต้องมีผู้เล่นอย่างน้อย ${MIN_PLAYERS} คน` };
  }
  room.status = "setup";
  pushChat(room, {
    fromId: null,
    fromName: "ระบบ",
    type: "system",
    text: "เริ่มเตรียมเกม — ตั้งคำตอบให้เพื่อน หรือสุ่มจาก AI",
  });
  return { ok: true };
}

/** Start playing: requires every player to have an answer assigned. */
export function beginPlaying(room: RoomState): { ok: boolean; error?: string } {
  if (room.status !== "setup") return { ok: false, error: "ยังไม่อยู่ในขั้นตอน setup" };
  const missing = room.players.filter((p) => !room.answers[p.id]);
  if (missing.length > 0) {
    return { ok: false, error: `ยังขาดคำตอบของ ${missing.map((m) => m.name).join(", ")}` };
  }
  room.status = "playing";
  room.round = 1;
  room.currentTurnIdx = 0;
  room.waitingForAnswer = false;
  room.turnOrder = room.players.map((p) => p.id);
  // shuffle turn order
  for (let i = room.turnOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [room.turnOrder[i], room.turnOrder[j]] = [room.turnOrder[j], room.turnOrder[i]];
  }
  room.finishers = [];
  for (const p of room.players) {
    p.guessedCorrectly = false;
    p.guessedThisRound = false;
  }
  pushChat(room, {
    fromId: null,
    fromName: "ระบบ",
    type: "system",
    text: "เริ่มเกม! แต่ละคนถามได้ทีละข้อ — ถ้าจะทาย จะหมดสิทธิ์ถามในรอบนั้นทันที",
  });
  return { ok: true };
}

/** Check if round is over: 3 finishers exist OR all players guessed/locked. */
export function isRoundOver(room: RoomState): boolean {
  if (room.finishers.length >= 3) return true;
  // everyone locked (guessed correctly OR used their wrong-guess attempt)
  const activeGuessers = room.players.filter(
    (p) => !p.guessedCorrectly && !p.guessedThisRound
  );
  return activeGuessers.length === 0;
}

function advanceTurn(room: RoomState) {
  const n = room.turnOrder.length;
  if (n === 0) return;
  for (let step = 0; step < n; step++) {
    room.currentTurnIdx = (room.currentTurnIdx + 1) % n;
    const pid = room.turnOrder[room.currentTurnIdx];
    const p = findPlayer(room, pid);
    if (p && !p.guessedCorrectly && !p.guessedThisRound) {
      return; // this player can still act
    }
  }
  // nobody can act -> round effectively over
}

/** Apply a player action. Mutates room and returns ok/error. */
export function applyAction(
  room: RoomState,
  playerId: string,
  payload: ActionPayload
): { ok: boolean; error?: string } {
  if (room.status !== "playing") {
    return { ok: false, error: "ยังไม่ได้เริ่มเล่น" };
  }

  // Migrate old rooms that may not have this field
  if (room.waitingForAnswer === undefined) {
    room.waitingForAnswer = false;
  }

  const player = findPlayer(room, playerId);
  if (!player) return { ok: false, error: "ไม่พบผู้เล่น" };
  if (player.guessedCorrectly) {
    return { ok: false, error: "คุณทายถูกแล้ว รอจบรอบ" };
  }

  const currentTurnId =
    room.turnOrder[room.currentTurnIdx % room.turnOrder.length];

  // ──── ASK ────
  if (payload.type === "ask") {
    if (playerId !== currentTurnId) {
      return { ok: false, error: "ยังไม่ถึงตาคุณ" };
    }
    if (player.guessedThisRound) {
      return { ok: false, error: "คุณทายไปแล้ว หมดสิทธิ์ถามรอบนี้" };
    }
    if (room.waitingForAnswer) {
      return { ok: false, error: "รอคำตอบจากผู้เล่นคนอื่นก่อน" };
    }
    const text = payload.text.trim().slice(0, 200);
    if (!text) return { ok: false, error: "พิมพ์คำถาม" };
    pushChat(room, {
      fromId: player.id,
      fromName: player.name,
      type: "question",
      text,
    });
    // Do NOT advance turn yet — wait for someone to answer first
    room.waitingForAnswer = true;
    return { ok: true };
  }

  // ──── ANSWER ────
  if (payload.type === "answer") {
    if (!room.waitingForAnswer) {
      return { ok: false, error: "ยังไม่มีคำถาม — รอจนกว่าจะมีการถาม" };
    }
    // The asker (current turn) cannot answer their own question
    if (playerId === currentTurnId) {
      return { ok: false, error: "คุณถามเอง ตอบเองไม่ได้" };
    }
    pushChat(room, {
      fromId: player.id,
      fromName: player.name,
      type: "answer",
      text: payload.text,
    });
    // First answer received → clear waiting flag and advance to next turn
    room.waitingForAnswer = false;
    advanceTurn(room);
    if (isRoundOver(room)) {
      endRound(room);
    }
    return { ok: true };
  }

  // ──── GUESS ────
  if (payload.type === "guess") {
    if (player.guessedThisRound) {
      return { ok: false, error: "คุณทายไปแล้วครั้งหนึ่งรอบนี้" };
    }
    // If someone guesses while we're waiting for an answer, drop the wait
    // (the question is implicitly abandoned)
    if (room.waitingForAnswer) {
      room.waitingForAnswer = false;
    }

    const guess = payload.text.trim().slice(0, 100);
    if (!guess) return { ok: false, error: "พิมพ์คำทาย" };
    const answer = (room.answers[playerId] ?? "").trim().toLowerCase();
    const correct =
      answer.length > 0 &&
      (guess.toLowerCase() === answer ||
        answer.includes(guess.toLowerCase()) ||
        guess.toLowerCase().includes(answer));

    // guesser forfeits asking this round immediately
    player.guessedThisRound = true;

    if (correct) {
      player.guessedCorrectly = true;
      room.finishers.push(player.id);
      const rank = room.finishers.length;
      const pts = SCORE_BOARD[rank - 1] ?? 0;
      player.score += pts;
      pushChat(room, {
        fromId: player.id,
        fromName: player.name,
        type: "guess",
        text: guess,
        correct: true,
      });
      pushChat(room, {
        fromId: null,
        fromName: "ระบบ",
        type: "system",
        text: `✅ ${player.name} ทายถูก! ได้ ${pts} คะแนน (อันดับ ${rank})`,
      });
    } else {
      pushChat(room, {
        fromId: player.id,
        fromName: player.name,
        type: "guess",
        text: guess,
        correct: false,
      });
      pushChat(room, {
        fromId: null,
        fromName: "ระบบ",
        type: "system",
        text: `❌ ${player.name} ทายผิด — หมดสิทธิ์ถาม+ทายรอบนี้`,
      });
    }

    // advance turn if it was the guesser's turn
    if (playerId === currentTurnId) {
      advanceTurn(room);
    }

    if (isRoundOver(room)) {
      endRound(room);
    }
    return { ok: true };
  }

  return { ok: false, error: "action ไม่ถูกต้อง" };
}

function endRound(room: RoomState) {
  room.status = "ended";
  room.waitingForAnswer = false;
  // reveal all answers
  pushChat(room, {
    fromId: null,
    fromName: "ระบบ",
    type: "system",
    text: "🎉 จบรอบ! เปิดเผยคำตอบทั้งหมดแล้ว",
  });
  for (const p of room.players) {
    const ans = room.answers[p.id] ?? "?";
    pushChat(room, {
      fromId: null,
      fromName: "ระบบ",
      type: "system",
      text: `${p.name}: ${ans}`,
    });
  }
}

/** Start a fresh round: new answers required (host re-runs setup) or reuse. */
export function startNextRound(room: RoomState): { ok: boolean; error?: string } {
  if (room.status !== "ended") return { ok: false, error: "ยังไม่จบรอบ" };
  room.status = "setup";
  room.round += 1;
  room.finishers = [];
  room.currentTurnIdx = 0;
  room.waitingForAnswer = false;
  for (const p of room.players) {
    p.guessedCorrectly = false;
    p.guessedThisRound = false;
  }
  // keep old answers but host may reset; clear to force re-setup
  room.answers = {};
  room.setupMode = "manual";
  room.topic = "";
  room.difficulty = "medium";
  pushChat(room, {
    fromId: null,
    fromName: "ระบบ",
    type: "system",
    text: `เริ่มรอบ ${room.round} — ตั้งคำตอบใหม่`,
  });
  return { ok: true };
}
