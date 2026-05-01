// Session storage. Narrow surface so we can swap KV for Durable Objects
// later without rewriting the routes — see decision-log entry
// 2026-05-01 02:05 ("Persistence: Cloudflare KV for sessions").

import { prompts } from "./prompts";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const SESSION_TTL_SECONDS = 60 * 60 * 24;
const MAX_PARTICIPANTS = 4;
const MAX_CODE_GENERATION_ATTEMPTS = 8;
const MAX_ANSWER_LENGTH = 2000;

export type Participant = {
  id: string;
  joinedAt: number;
};

export type Session = {
  code: string;
  createdAt: number;
  participants: Array<Participant>;
  currentPromptIndex: number;
  answers: Record<string, Record<string, string>>;
  completedAt: number | null;
  startedAt: number | null;
};

const sessionKey = (code: string): string => `session:${code}`;

const generateCode = (): string => {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const byte = bytes[i] ?? 0;
    out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return out;
};

const writeSession = async (
  kv: KVNamespace,
  session: Session,
): Promise<void> => {
  await kv.put(sessionKey(session.code), JSON.stringify(session), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
};

// Older session blobs may pre-date the deck-of-prompts schema (they were
// written before the answers/index/completed fields existed). Coerce any
// missing fields to safe defaults rather than crashing — TTL means
// older blobs disappear within 24 hours anyway.
const hydrateSession = (raw: string): Session => {
  const parsed = JSON.parse(raw) as Partial<Session> & {
    code: string;
    createdAt: number;
    participants: Array<Participant>;
  };
  return {
    code: parsed.code,
    createdAt: parsed.createdAt,
    participants: parsed.participants,
    currentPromptIndex: parsed.currentPromptIndex ?? 0,
    answers: parsed.answers ?? {},
    completedAt: parsed.completedAt ?? null,
    startedAt: parsed.startedAt ?? null,
  };
};

export const createSession = async (
  kv: KVNamespace,
  hostParticipantId: string,
): Promise<Session> => {
  // Re-roll if we collide with an existing code. Six characters from a
  // 31-char alphabet gives ~887M permutations, so collisions are rare,
  // but we still guard against them to avoid clobbering live sessions.
  for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const code = generateCode();
    const existing = await kv.get(sessionKey(code));
    if (existing !== null) {
      continue;
    }
    const now = Date.now();
    const session: Session = {
      code,
      createdAt: now,
      participants: [{ id: hostParticipantId, joinedAt: now }],
      currentPromptIndex: 0,
      answers: {},
      completedAt: null,
      startedAt: null,
    };
    await writeSession(kv, session);
    return session;
  }
  throw new Error("Could not mint a unique session code");
};

export const getSession = async (
  kv: KVNamespace,
  code: string,
): Promise<Session | null> => {
  const raw = await kv.get(sessionKey(code));
  if (raw === null) {
    return null;
  }
  return hydrateSession(raw);
};

export const joinSession = async (
  kv: KVNamespace,
  code: string,
  participantId: string,
): Promise<Session | null> => {
  const session = await getSession(kv, code);
  if (session === null) {
    return null;
  }
  const alreadyJoined = session.participants.some(
    (p) => p.id === participantId,
  );
  if (alreadyJoined) {
    return session;
  }
  // Once the host has begun the conversation the room closes — no
  // late joiners can sneak in. The 4-participant cap still applies for
  // sessions that have not started.
  if (session.startedAt !== null) {
    return null;
  }
  if (session.participants.length >= MAX_PARTICIPANTS) {
    return null;
  }
  const updated: Session = {
    ...session,
    participants: [
      ...session.participants,
      { id: participantId, joinedAt: Date.now() },
    ],
  };
  await writeSession(kv, updated);
  return updated;
};

export const startSession = async (
  kv: KVNamespace,
  code: string,
  participantId: string,
): Promise<Session | null> => {
  const session = await getSession(kv, code);
  if (session === null) {
    return null;
  }
  // Only the host (the first joiner) can start the conversation.
  const host = session.participants[0];
  if (host === undefined || host.id !== participantId) {
    return null;
  }
  // Need at least two participants in the room before the deck can run.
  if (session.participants.length < 2) {
    return null;
  }
  // Idempotent on already-started: do not re-stamp, just return what's
  // already in KV. Caller will redirect to the inside view either way.
  if (session.startedAt !== null) {
    return session;
  }
  const updated: Session = {
    ...session,
    startedAt: Date.now(),
  };
  await writeSession(kv, updated);
  return updated;
};

// True iff every currently-joined participant has an answer recorded for
// the given prompt id. The reveal lock keys off this: once it flips
// true, submitAnswer refuses further writes until advanceSession bumps
// the index.
const allParticipantsAnswered = (
  session: Session,
  promptId: string,
): boolean => {
  const answersForPrompt = session.answers[promptId];
  if (answersForPrompt === undefined) {
    return false;
  }
  return session.participants.every(
    (p) => typeof answersForPrompt[p.id] === "string",
  );
};

export const submitAnswer = async (
  kv: KVNamespace,
  code: string,
  participantId: string,
  promptId: string,
  text: string,
): Promise<Session | null> => {
  const session = await getSession(kv, code);
  if (session === null) {
    return null;
  }
  if (session.completedAt !== null) {
    return null;
  }
  const isParticipant = session.participants.some(
    (p) => p.id === participantId,
  );
  if (!isParticipant) {
    return null;
  }
  const currentPrompt = prompts[session.currentPromptIndex];
  if (currentPrompt === undefined) {
    return null;
  }
  if (currentPrompt.id !== promptId) {
    return null;
  }
  // Reveal lock: once everyone has submitted, no further writes for
  // this prompt — answers are frozen until someone advances.
  if (allParticipantsAnswered(session, promptId)) {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed === "") {
    return null;
  }
  const capped =
    trimmed.length > MAX_ANSWER_LENGTH
      ? trimmed.slice(0, MAX_ANSWER_LENGTH)
      : trimmed;
  const existingForPrompt = session.answers[promptId] ?? {};
  const updated: Session = {
    ...session,
    answers: {
      ...session.answers,
      [promptId]: {
        ...existingForPrompt,
        [participantId]: capped,
      },
    },
  };
  await writeSession(kv, updated);
  return updated;
};

export const advanceSession = async (
  kv: KVNamespace,
  code: string,
  participantId: string,
): Promise<Session | null> => {
  const session = await getSession(kv, code);
  if (session === null) {
    return null;
  }
  if (session.completedAt !== null) {
    return null;
  }
  const isParticipant = session.participants.some(
    (p) => p.id === participantId,
  );
  if (!isParticipant) {
    return null;
  }
  const currentPrompt = prompts[session.currentPromptIndex];
  if (currentPrompt === undefined) {
    return null;
  }
  // Reveal lock the other way round: nobody advances until everyone
  // currently in the session has answered. This is also what stops a
  // participant from racing past the reveal.
  if (!allParticipantsAnswered(session, currentPrompt.id)) {
    return null;
  }
  const nextIndex = session.currentPromptIndex + 1;
  const completedAt = nextIndex >= prompts.length ? Date.now() : null;
  const updated: Session = {
    ...session,
    currentPromptIndex: nextIndex,
    completedAt,
  };
  await writeSession(kv, updated);
  return updated;
};
