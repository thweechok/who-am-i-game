// Core game data types shared across server + client

export type RoomStatus = "lobby" | "setup" | "playing" | "ended";

export type SetupMode = "manual" | "ai";

export interface Player {
  id: string;
  name: string;
  score: number;
  guessedCorrectly: boolean;
  guessedThisRound: boolean;
  lastSeen: number;
  bonusQuestions: number;
  /** true = spectator, can watch but not play */
  isSpectator: boolean;
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
  /** playerId -> image URL for their answer (optional) */
  answerImages: Record<string, string>;
  /** order of play by playerId */
  turnOrder: string[];
  currentTurnIdx: number;
  round: number;
  chat: ChatMessage[];
  /** ranked finishers this round (playerIds in order) for scoring */
  finishers: string[];
  /** true when someone has asked a question and we are waiting for an answer
   *  before advancing to the next turn */
  waitingForAnswer: boolean;
  /** The current pending question text */
  currentQuestion: string | null;
  /** Votes from each player on the current question: playerId -> vote */
  votes: Record<string, "yes" | "no" | "maybe">;
  difficulty: "easy" | "medium" | "hard";
  maxQuestionsPerTurn: number;
  questionsThisTurn: number;
  /** unix ms when playing phase started (for countdown timer) */
  roundStartedAt: number;
  /** round duration in seconds (default 420 = 7 min) */
  roundDurationSeconds: number;
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
  /** image URLs for answers */
  answerImages: Record<string, string>;
  myAnswer: string | null;
  myAnswerAssigned: boolean;
  turnOrder: string[];
  currentTurnIdx: number;
  currentTurnId: string | null;
  round: number;
  chat: ChatMessage[];
  finishers: string[];
  /** mirrors RoomState.waitingForAnswer — lets clients show answer buttons */
  waitingForAnswer: boolean;
  currentQuestion: string | null;
  votes: Record<string, "yes" | "no" | "maybe">;
  difficulty: "easy" | "medium" | "hard";
  maxQuestionsPerTurn: number;
  questionsThisTurn: number;
  roundStartedAt: number;
  roundDurationSeconds: number;
  /** true if the viewer is a spectator */
  isSpectator: boolean;
  /** all answers — only populated for spectators */
  allAnswers: Record<string, string>;
  createdAt: number;
}

/** Action types posted to /api/rooms/[code]/action */
export type ActionPayload =
  | { type: "ask"; text: string }
  | { type: "answer"; text: "yes" | "no" | "maybe" }
  | { type: "guess"; text: string }
  | { type: "pass" }
  | { type: "setMaxQuestions"; value: number }
  | { type: "timeUp" };
