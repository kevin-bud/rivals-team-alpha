import { createSession, getSession, joinSession, type Session } from "./sessions";

type Env = {
  SESSIONS: KVNamespace;
};

const PARTICIPANT_COOKIE = "rt_pid";
const COOKIE_MAX_AGE = 60 * 60 * 24;
const SESSION_TARGET_PARTICIPANTS = 2;

const sharedStyles = `
  :root {
    --ink: #1a1a1a;
    --paper: #f6f3ee;
    --accent: #2f4f3f;
    --muted: #6b6b6b;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ui-serif, Georgia, "Times New Roman", serif;
    background: var(--paper);
    color: var(--ink);
    line-height: 1.55;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  main {
    flex: 1;
    max-width: 36rem;
    margin: 0 auto;
    padding: 4rem 1.5rem 2rem;
  }
  h1 {
    font-size: 2.75rem;
    margin: 0 0 0.25rem;
    letter-spacing: -0.01em;
  }
  .tagline {
    color: var(--muted);
    margin: 0 0 2rem;
    font-style: italic;
  }
  p.lede { font-size: 1.15rem; margin: 0 0 2rem; }
  .cta {
    display: inline-block;
    background: var(--accent);
    color: var(--paper);
    font: inherit;
    font-size: 1.05rem;
    padding: 0.85rem 1.6rem;
    border: 0;
    border-radius: 999px;
    text-decoration: none;
    cursor: pointer;
  }
  .cta:hover, .cta:focus { background: #243d31; outline: none; }
  footer {
    max-width: 36rem;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
    font-size: 0.85rem;
    color: var(--muted);
    border-top: 1px solid rgba(0,0,0,0.08);
  }
  .code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 2.25rem;
    letter-spacing: 0.25em;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 0.5rem;
    padding: 0.75rem 1.25rem;
    display: inline-block;
    margin: 0 0 1rem;
  }
  .share-url {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.95rem;
    word-break: break-all;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 0.5rem;
    padding: 0.6rem 0.85rem;
    display: block;
    margin: 0 0 1.5rem;
  }
  .count {
    font-size: 1.05rem;
    margin: 0 0 1rem;
    color: var(--accent);
  }
  .placeholder {
    color: var(--muted);
    font-style: italic;
    margin: 0 0 2rem;
  }
  a.back { color: var(--accent); }
`;

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (ch) => {
    if (ch === "&") {
      return "&amp;";
    }
    if (ch === "<") {
      return "&lt;";
    }
    if (ch === ">") {
      return "&gt;";
    }
    if (ch === '"') {
      return "&quot;";
    }
    return "&#39;";
  });

const landingHtml = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roundtable — a guided money conversation for households</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <main>
      <h1>Roundtable</h1>
      <p class="tagline">A guided money conversation for households.</p>
      <p class="lede">
        Roundtable is a place for the people in a household to talk about
        their shared money more deliberately. It walks you through the
        topics together, keeps the conversation balanced, and captures
        what you decide. It is not a budget tool, not an advisor — just
        a structured way to have the talk you have been meaning to have.
      </p>
      <form method="post" action="/sessions">
        <button class="cta" type="submit">Start a session</button>
      </form>
    </main>
    <footer>
      Roundtable does not provide financial, tax, legal, or investment
      advice. Sessions are stored on Cloudflare KV for 24 hours, then
      deleted. We do not collect accounts, names, or emails.
    </footer>
  </body>
</html>
`;

const notFoundHtml = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roundtable — session not found</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <main>
      <h1>Session not found</h1>
      <p class="lede">This session has ended or never existed.</p>
      <p><a class="back" href="/">Back to the start</a></p>
    </main>
  </body>
</html>
`;

const sessionFullHtml = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roundtable — session full</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <main>
      <h1>Session full</h1>
      <p class="lede">
        That session already has the maximum number of participants. Ask
        the host to start a new one.
      </p>
      <p><a class="back" href="/">Back to the start</a></p>
    </main>
  </body>
</html>
`;

const renderInsideView = (
  session: Session,
  origin: string,
): string => {
  const shareUrl = `${origin}/s/${session.code}/join`;
  const count = session.participants.length;
  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="5" />
    <title>Roundtable — session ${escapeHtml(session.code)}</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <main>
      <h1>You are in</h1>
      <p class="tagline">Share this code or link with the other person.</p>
      <p class="code">${escapeHtml(session.code)}</p>
      <a class="share-url" href="${escapeHtml(shareUrl)}">${escapeHtml(shareUrl)}</a>
      <p class="count">${count} of ${SESSION_TARGET_PARTICIPANTS} here</p>
      <p class="placeholder">
        Prompts coming next — partner needs to join to continue.
      </p>
      <p><a class="back" href="/">Back to the start</a></p>
    </main>
    <footer>
      Roundtable does not provide financial, tax, legal, or investment
      advice. Sessions are stored on Cloudflare KV for 24 hours, then
      deleted. We do not collect accounts, names, or emails.
    </footer>
  </body>
</html>
`;
};

const renderJoinView = (code: string): string =>
  `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roundtable — join session ${escapeHtml(code)}</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <main>
      <h1>Join this session</h1>
      <p class="tagline">You have been invited to a Roundtable session.</p>
      <p class="lede">
        Tap below to join. The link itself is your invitation — there is
        no code to type.
      </p>
      <form method="post" action="/s/${escapeHtml(code)}/join">
        <button class="cta" type="submit">Join this session</button>
      </form>
    </main>
    <footer>
      Roundtable does not provide financial, tax, legal, or investment
      advice. Sessions are stored on Cloudflare KV for 24 hours, then
      deleted. We do not collect accounts, names, or emails.
    </footer>
  </body>
</html>
`;

const htmlResponse = (
  body: string,
  init: ResponseInit = {},
): Response => {
  const headers = new Headers(init.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(body, { ...init, headers });
};

const parseCookies = (header: string | null): Record<string, string> => {
  const out: Record<string, string> = {};
  if (header === null) {
    return out;
  }
  const parts = header.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === "") {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const name = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    out[name] = decodeURIComponent(value);
  }
  return out;
};

const buildParticipantCookie = (id: string): string =>
  `${PARTICIPANT_COOKIE}=${encodeURIComponent(id)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`;

const getOrMintParticipantId = (
  request: Request,
): { id: string; minted: boolean } => {
  const cookies = parseCookies(request.headers.get("cookie"));
  const existing = cookies[PARTICIPANT_COOKIE];
  if (existing !== undefined && existing !== "") {
    return { id: existing, minted: false };
  }
  return { id: crypto.randomUUID(), minted: true };
};

const requestOrigin = (request: Request): string => {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
};

const matchSessionPath = (
  pathname: string,
): { code: string; rest: string } | null => {
  if (!pathname.startsWith("/s/")) {
    return null;
  }
  const tail = pathname.slice(3);
  const slash = tail.indexOf("/");
  if (slash === -1) {
    return { code: tail, rest: "" };
  }
  return { code: tail.slice(0, slash), rest: tail.slice(slash) };
};

const handle = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (url.pathname === "/" && method === "GET") {
    return htmlResponse(landingHtml);
  }

  if (url.pathname === "/sessions" && method === "POST") {
    const { id, minted } = getOrMintParticipantId(request);
    const session = await createSession(env.SESSIONS, id);
    const headers = new Headers();
    headers.set("location", `/s/${session.code}`);
    if (minted) {
      headers.append("set-cookie", buildParticipantCookie(id));
    }
    return new Response(null, { status: 303, headers });
  }

  const sessionMatch = matchSessionPath(url.pathname);
  if (sessionMatch !== null) {
    const { code, rest } = sessionMatch;

    if (rest === "" && method === "GET") {
      const session = await getSession(env.SESSIONS, code);
      if (session === null) {
        return htmlResponse(notFoundHtml, { status: 404 });
      }
      const cookies = parseCookies(request.headers.get("cookie"));
      const pid = cookies[PARTICIPANT_COOKIE];
      const isParticipant =
        pid !== undefined &&
        session.participants.some((p) => p.id === pid);
      if (isParticipant) {
        return htmlResponse(renderInsideView(session, requestOrigin(request)));
      }
      return htmlResponse(renderJoinView(code));
    }

    if (rest === "/join" && method === "POST") {
      const { id, minted } = getOrMintParticipantId(request);
      const updated = await joinSession(env.SESSIONS, code, id);
      if (updated === null) {
        const exists = await getSession(env.SESSIONS, code);
        if (exists === null) {
          return htmlResponse(notFoundHtml, { status: 404 });
        }
        return htmlResponse(sessionFullHtml, { status: 409 });
      }
      const headers = new Headers();
      headers.set("location", `/s/${code}`);
      if (minted) {
        headers.append("set-cookie", buildParticipantCookie(id));
      }
      return new Response(null, { status: 303, headers });
    }
  }

  return htmlResponse(notFoundHtml, { status: 404 });
};

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env);
  },
} satisfies ExportedHandler<Env>;
