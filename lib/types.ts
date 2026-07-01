// Core game data types shared across server + client

export type RoomStatus = "lobby" | "setup" | "playing" | "ended";

export type SetupMode = "manual" | "ai";

export interface Player {
  id: string;
  name: string;
  score: number;
  /** guessed this round correctly already (locked out from guessing again) */
  guessedCorrectly: boolean;
  /** has used their one guess attempt this round (wrong guess) */
  guessedThisRound: boolean;
  /** online flag for reconnect; not strictly required */
  lastSeen: number;
}

export type ChatType = "question" | "answer" | "guess" | "system";

export interface ChatMessage {
  id: string;
  fromId: string | null; // null = system
  fromName: string;
  type: ChatType;
  text: string;
  /** for guess: whether it was correct */
  correct?: boolean;
  ts: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  status: RoomStatus;
  /** bumped on every mutation; client uses it for conditional polling */
  version: number;
  setupMode: SetupMode;
  topic: string; // for ai mode: the topic prompt
  players: Player[];
  /** playerId -> their answer (the "thing on their head") */
  answers: Record<string, string>;
  /** order of play by playerId */
  turnOrder: string[];
  currentTurnIdx: number;
  round: number;
  chat: ChatMessage[];
  /** ranked finishers this round (playerIds in order) for scoring */
  finishers: string[];
  createdAt: number;
}

/** Public-facing room state: answers of OTHER players visible, own answer hidden */
export interface PublicRoomState {
  code: string;
  hostId: string;
  status: RoomStatus;
  version: number;
  setupMode: SetupMode;
  topic: string;
  players: Player[];
  /** myAnswer is null/hidden; others' answers visible */
  answers: Record<string, string>;
  myAnswer: string | null;
  turnOrder: string[];
  currentTurnIdx: number;
  currentTurnId: string | null;
  round: number;
  chat: ChatMessage[];
  finishers: string[];
  createdAt: number;
}

/** Action types posted to /api/rooms/[code]/action */
export type ActionPayload =
  | { type: "ask"; text: string }
  | { type: "answer"; text: "yes" | "no" | "maybe" }
  | { type: "guess"; text: string };
