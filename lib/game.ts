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
    answerImages: {},
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
    currentQuestion: null,
    votes: {},
    difficulty: "medium",
    maxQuestionsPerTurn: 5,
    questionsThisTurn: 0,
    roundStartedAt: 0,
    roundDurationSeconds: 420,
    createdAt: Date.now(),
  };
}

export function newPlayer(name: string, isSpectator = false): Player {
  const trimmed = name.trim().slice(0, 20) || "ผู้เล่น";
  return {
    id: genId(),
    name: trimmed,
    score: 0,
    guessedCorrectly: false,
    guessedThisRound: false,
    lastSeen: Date.now(),
    bonusQuestions: 2,
    isSpectator,
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
  const viewer = room.players.find(p => p.id === viewerId);
  const isSpectator = viewer?.isSpectator ?? false;
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
    // HIDE own answer during setup+playing — only reveal when round ends
    myAnswer: room.status === "ended" ? (room.answers[viewerId] ?? null) : null,
    myAnswerAssigned: !!room.answers[viewerId],
    turnOrder: room.turnOrder,
    currentTurnIdx: room.currentTurnIdx,
    currentTurnId,
    round: room.round,
    chat: room.chat,
    finishers: room.finishers,
    waitingForAnswer: room.waitingForAnswer,
    currentQuestion: room.currentQuestion,
    votes: room.votes,
    difficulty: room.difficulty ?? "medium",
    maxQuestionsPerTurn: room.maxQuestionsPerTurn ?? 5,
    questionsThisTurn: room.questionsThisTurn ?? 0,
    roundStartedAt: room.roundStartedAt ?? 0,
    roundDurationSeconds: room.roundDurationSeconds ?? 420,
    isSpectator,
    // In ended phase all answers are revealed to everyone
    allAnswers: (isSpectator || room.status === "ended") ? { ...room.answers } : {},
    answerImages: room.answerImages ?? {},
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
  // Spectators can join at any time
  if (!player.isSpectator && room.status !== "lobby") {
    return { ok: false, error: "เกมเริ่มแล้ว ไม่สามารถเข้าร่วมได้ (ลองเข้าร่วมเป็นคนดูแทนได้)" };
  }
  if (!player.isSpectator && room.players.filter(p => !p.isSpectator).length >= MAX_PLAYERS) {
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
  const activePlayers = room.players.filter(p => !p.isSpectator);
  if (activePlayers.length < MIN_PLAYERS) {
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

/** Start playing: requires every active (non-spectator) player to have an answer assigned. */
export function beginPlaying(room: RoomState): { ok: boolean; error?: string } {
  if (room.status !== "setup") return { ok: false, error: "ยังไม่อยู่ในขั้นตอน setup" };
  const missing = room.players.filter((p) => !p.isSpectator && !room.answers[p.id]);
  if (missing.length > 0) {
    return { ok: false, error: `ยังขาดคำตอบของ ${missing.map((m) => m.name).join(", ")}` };
  }
  room.status = "playing";
  room.round = 1;
  room.currentTurnIdx = 0;
  room.waitingForAnswer = false; room.currentQuestion = null; room.votes = {};
  room.questionsThisTurn = 0;
  room.roundStartedAt = Date.now();
  room.turnOrder = room.players.filter(p => !p.isSpectator).map((p) => p.id);
  for (let i = room.turnOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [room.turnOrder[i], room.turnOrder[j]] = [room.turnOrder[j], room.turnOrder[i]];
  }
  room.finishers = [];
  for (const p of room.players) {
    p.guessedCorrectly = false;
    p.guessedThisRound = false;
    p.bonusQuestions = 2;
  }
  pushChat(room, {
    fromId: null,
    fromName: "ระบบ",
    type: "system",
    text: `เริ่มเกม! ถามได้คนละ ${room.maxQuestionsPerTurn} ข้อต่อตา + โบนัส 2 ข้อ ⏱️ เวลา ${Math.floor((room.roundDurationSeconds ?? 420) / 60)} นาที`,
  });
  return { ok: true };
}

/** Check if round is over: 3 finishers exist OR all active (non-spectator) players guessed/locked. */
export function isRoundOver(room: RoomState): boolean {
  if (room.finishers.length >= 3) return true;
  const activeGuessers = room.players.filter(
    (p) => !p.isSpectator && !p.guessedCorrectly && !p.guessedThisRound
  );
  return activeGuessers.length === 0;
}

function advanceTurn(room: RoomState) {
  const n = room.turnOrder.length;
  if (n === 0) return;
  const prevIdx = room.currentTurnIdx;
  for (let step = 0; step < n; step++) {
    room.currentTurnIdx = (room.currentTurnIdx + 1) % n;
    const pid = room.turnOrder[room.currentTurnIdx];
    const p = findPlayer(room, pid);
    if (p && !p.guessedCorrectly && !p.guessedThisRound) {
      // Reset question counter for the new player's turn
      room.questionsThisTurn = 0;
      return;
    }
  }
  // nobody can act → round effectively over
}

/** Apply a player action. Mutates room and returns ok/error. */
export function applyAction(
  room: RoomState,
  playerId: string,
  payload: ActionPayload
): { ok: boolean; error?: string } {
  // ──── SET MAX QUESTIONS (host only, any status) ────
  // Must be checked BEFORE the playing-status guard
  if (payload.type === "setMaxQuestions") {
    if (room.hostId !== playerId) {
      return { ok: false, error: "เฉพาะ host เท่านั้น" };
    }
    room.maxQuestionsPerTurn = Math.max(0, Math.min(20, Number(payload.value ?? 5)));
    return { ok: true };
  }

  // ──── TIME UP (works from any status with timer) ────
  if (payload.type === "timeUp") {
    if (room.status !== "playing") return { ok: false, error: "เกมไม่ได้กำลังเล่น" };
    const startedAt = room.roundStartedAt ?? 0;
    const durMs = (room.roundDurationSeconds ?? 420) * 1000;
    if (startedAt > 0 && Date.now() - startedAt >= durMs) {
      endRound(room);
      return { ok: true };
    }
    return { ok: false, error: "ยังไม่หมดเวลา" };
  }

  if (room.status !== "playing") {
    return { ok: false, error: "ยังไม่ได้เริ่มเล่น" };
  }

  // Migrate old rooms that may not have this field
  if (room.waitingForAnswer === undefined) {
    room.waitingForAnswer = false; room.currentQuestion = null; room.votes = {};
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
    // Check question limit
    const maxQ = room.maxQuestionsPerTurn ?? 5;
    const used = room.questionsThisTurn ?? 0;
    if (maxQ > 0 && used >= maxQ) {
      // Check if player has bonus questions
      if ((player.bonusQuestions ?? 0) <= 0) {
        return { ok: false, error: `ครบ ${maxQ} คำถามแล้ว — ต้องทายหรือผ่าน!` };
      }
      // Use a bonus question
      player.bonusQuestions -= 1;
      pushChat(room, {
        fromId: null, fromName: "ระบบ", type: "system",
        text: `🎁 ${player.name} ใช้โบนัสคำถาม (เหลือ ${player.bonusQuestions} ข้อ)`,
      });
    }
    const text = payload.text.trim().slice(0, 200);
    if (!text) return { ok: false, error: "พิมพ์คำถาม" };
    pushChat(room, {
      fromId: player.id,
      fromName: player.name,
      type: "question",
      text,
    });
    room.questionsThisTurn = (room.questionsThisTurn ?? 0) + 1;
    room.waitingForAnswer = true;
    room.currentQuestion = text;
    room.votes = {};
    return { ok: true };
  }

  // ──── ANSWER (vote system: each player votes) ────
  if (payload.type === "answer") {
    if (!room.waitingForAnswer) {
      return { ok: false, error: "ยังไม่มีคำถาม — รอจนกว่าจะมีการถาม" };
    }
    // The asker (current turn) cannot answer their own question
    if (playerId === currentTurnId) {
      return { ok: false, error: "คุณถามเอง ตอบเองไม่ได้" };
    }
    // Players who already guessed or are spectators can't vote
    if (player.guessedCorrectly || player.isSpectator) {
      return { ok: false, error: "คุณไม่สามารถตอบได้" };
    }
    // Already voted?
    if (room.votes[playerId]) {
      return { ok: false, error: "คุณตอบไปแล้ว" };
    }
    // Record vote
    room.votes[playerId] = payload.text;

    // Check if all eligible voters have voted
    const eligibleVoters = room.players.filter(p =>
      !p.isSpectator && !p.guessedCorrectly && p.id !== currentTurnId
    );
    const allVoted = eligibleVoters.every(p => !!room.votes[p.id]);

    if (allVoted) {
      // Summarize votes into chat
      const voteLines = eligibleVoters.map(p => {
        const v = room.votes[p.id];
        const emoji = v === "yes" ? "✅" : v === "no" ? "❌" : "🤔";
        const label = v === "yes" ? "ใช่" : v === "no" ? "ไม่ใช่" : "ไม่รู้";
        return `${p.name}: ${emoji} ${label}`;
      }).join(" | ");

      // Count majority
      const yesCount = eligibleVoters.filter(p => room.votes[p.id] === "yes").length;
      const noCount = eligibleVoters.filter(p => room.votes[p.id] === "no").length;
      const maybeCount = eligibleVoters.filter(p => room.votes[p.id] === "maybe").length;
      const total = eligibleVoters.length;
      let summary = "";
      if (yesCount > noCount && yesCount >= maybeCount) summary = `✅ ใช่ (${yesCount}/${total})`;
      else if (noCount > yesCount && noCount >= maybeCount) summary = `❌ ไม่ใช่ (${noCount}/${total})`;
      else summary = `🤔 ไม่แน่ใจ (${yesCount}/${total})`;

      pushChat(room, {
        fromId: null,
        fromName: "ระบบ",
        type: "answer",
        text: `${voteLines}\n${summary}`,
      });

      room.waitingForAnswer = false; room.currentQuestion = null; room.votes = {};
      room.currentQuestion = null;
    }

    return { ok: true };
  }

  // ──── GUESS ────
  if (payload.type === "guess") {
    if (playerId !== currentTurnId) {
      return { ok: false, error: "ยังไม่ถึงตาคุณ" };
    }
    if (player.guessedThisRound) {
      return { ok: false, error: "คุณทายไปแล้วครั้งหนึ่งรอบนี้" };
    }
    // If someone guesses while we're waiting for an answer, abandon the pending question
    if (room.waitingForAnswer) {
      room.waitingForAnswer = false; room.currentQuestion = null; room.votes = {};
      pushChat(room, {
        fromId: null, fromName: "ระบบ", type: "system",
        text: `⚠️ ${player.name} ทาย — ยกเลิกคำถามที่ค้างอยู่`,
      });
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

  // ──── PASS ────
  if (payload.type === "pass") {
    if (playerId !== currentTurnId) {
      return { ok: false, error: "ยังไม่ถึงตาคุณ" };
    }
    if (player.guessedThisRound) {
      return { ok: false, error: "คุณใช้สิทธิ์ไปแล้ว" };
    }
    if (room.waitingForAnswer) {
      room.waitingForAnswer = false; room.currentQuestion = null; room.votes = {};
      pushChat(room, {
        fromId: null, fromName: "ระบบ", type: "system",
        text: `➡️ ${player.name} ผ่าน — ยกเลิกคำถามที่ค้างอยู่`,
      });
    }
    // NOTE: do NOT set guessedThisRound here — passing just skips this turn,
    // the player should get another turn when it cycles back
    pushChat(room, {
      fromId: null,
      fromName: "ระบบ",
      type: "system",
      text: `➡️ ${player.name} ผ่าน — ข้ามตา`,
    });
    advanceTurn(room);
    if (isRoundOver(room)) {
      endRound(room);
    }
    return { ok: true };
  }

  return { ok: false, error: "action ไม่ถูกต้อง" };
}

function endRound(room: RoomState) {
  room.status = "ended";
  room.waitingForAnswer = false; room.currentQuestion = null; room.votes = {};
  // reveal all answers
  pushChat(room, {
    fromId: null,
    fromName: "ระบบ",
    type: "system",
    text: "🎉 จบรอบ! เปิดเผยคำตอบทั้งหมดแล้ว",
  });
  for (const p of room.players.filter(p => !p.isSpectator)) {
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
  const active = room.players.filter(p => !p.isSpectator);
  if (active.length < 2) return { ok: false, error: "ผู้เล่นไม่พอ (ต้องอย่างน้อย 2 คน)" };
  room.status = "setup";
  room.round += 1;
  room.finishers = [];
  room.currentTurnIdx = 0;
  room.waitingForAnswer = false; room.currentQuestion = null; room.votes = {};
  for (const p of room.players) {
    p.guessedCorrectly = false;
    p.guessedThisRound = false;
  }
  // clear answers — host must re-run AI setup
  room.answers = {};
  room.answerImages = {};
  room.setupMode = "ai";
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
