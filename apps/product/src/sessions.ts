// Session storage. Narrow surface so we can swap KV for Durable Objects
// later without rewriting the routes — see decision-log entry
// 2026-05-01 02:05 ("Persistence: Cloudflare KV for sessions").

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const SESSION_TTL_SECONDS = 60 * 60 * 24;
const MAX_PARTICIPANTS = 4;
const MAX_CODE_GENERATION_ATTEMPTS = 8;

export type Participant = {
  id: string;
  joinedAt: number;
};

export type Session = {
  code: string;
  createdAt: number;
  participants: Array<Participant>;
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
  return JSON.parse(raw) as Session;
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
