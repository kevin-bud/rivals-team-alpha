import {
  advanceSession,
  createSession,
  getSession,
  joinSession,
  submitAnswer,
  type Participant,
  type Session,
} from "./sessions";
import { prompts, type Prompt } from "./prompts";

type Env = {
  SESSIONS: KVNamespace;
};

const PARTICIPANT_COOKIE = "rt_pid";
const COOKIE_MAX_AGE = 60 * 60 * 24;
const SESSION_TARGET_PARTICIPANTS = 2;
const PARTICIPANT_LABEL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_ANSWER_LENGTH = 2000;

const sharedStyles = `
  :root {
    --ink: #1a1a1a;
    --paper: #f6f3ee;
    --accent: #2f4f3f;
    --muted: #6b6b6b;
    --card: #ffffff;
    --border: rgba(0,0,0,0.08);
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
  h2 {
    font-size: 1.5rem;
    margin: 0 0 1rem;
    letter-spacing: -0.005em;
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
    border-top: 1px solid var(--border);
  }
  .code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 2.25rem;
    letter-spacing: 0.25em;
    background: #fff;
    border: 1px solid var(--border);
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
    border: 1px solid var(--border);
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
  .deck-meta {
    color: var(--muted);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0 0 0.75rem;
  }
  .prompt {
    font-size: 1.4rem;
    line-height: 1.45;
    margin: 0 0 1.5rem;
    padding: 1.25rem 1.5rem;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
  }
  textarea {
    width: 100%;
    font: inherit;
    font-size: 1rem;
    padding: 0.75rem 0.85rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: #fff;
    resize: vertical;
    margin: 0 0 1rem;
  }
  textarea:focus { outline: 2px solid var(--accent); outline-offset: 2px; }
  .helper {
    color: var(--muted);
    font-size: 0.95rem;
    margin: 0 0 1.5rem;
  }
  .answers {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin: 0 0 2rem;
  }
  @media (min-width: 32rem) {
    .answers.side-by-side { grid-template-columns: 1fr 1fr; }
  }
  .answer-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 1rem 1.15rem;
  }
  .answer-card .label {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin: 0 0 0.5rem;
  }
  .answer-card .body {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .recap-item {
    margin: 0 0 2rem;
    padding: 0 0 1.5rem;
    border-bottom: 1px solid var(--border);
  }
  .recap-item:last-child { border-bottom: 0; }
  .takeaway {
    margin: 0 0 1.5rem;
    color: var(--muted);
    font-size: 0.95rem;
  }
  .takeaway-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin: 0 0 2rem;
  }
  .takeaway-actions button {
    font: inherit;
    font-size: 1rem;
    padding: 0.65rem 1.2rem;
    border: 1px solid var(--accent);
    border-radius: 999px;
    background: var(--card);
    color: var(--accent);
    cursor: pointer;
  }
  .takeaway-actions button:hover,
  .takeaway-actions button:focus {
    background: var(--accent);
    color: var(--paper);
    outline: none;
  }
  .copy-buffer {
    position: absolute;
    left: -9999px;
    top: 0;
    opacity: 0;
    pointer-events: none;
  }
  @media print {
    :root {
      --ink: #000;
      --paper: #fff;
      --accent: #000;
      --muted: #333;
      --card: #fff;
      --border: #999;
    }
    html, body {
      background: #fff;
      color: #000;
    }
    body {
      font-family: Georgia, "Times New Roman", serif;
      margin: 1.5cm;
    }
    main {
      max-width: none;
      padding: 0;
    }
    form,
    .takeaway,
    .takeaway-actions,
    a.back,
    .copy-buffer {
      display: none !important;
    }
    .recap-item {
      page-break-inside: avoid;
    }
    .answer-card {
      border: 1px solid #999;
    }
    footer {
      border-top: 1px solid #999;
      color: #000;
      margin-top: 2rem;
    }
  }
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

const sharedFooter = `<footer>
      Roundtable does not provide financial, tax, legal, or investment
      advice. Sessions are stored on Cloudflare KV for 24 hours, then
      deleted. We do not collect accounts, names, or emails.
    </footer>`;

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
    ${sharedFooter}
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

const renderActionErrorHtml = (code: string, message: string): string =>
  `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roundtable — couldn't save that</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <main>
      <h1>That didn't go through</h1>
      <p class="lede">${escapeHtml(message)}</p>
      <p><a class="back" href="/s/${escapeHtml(code)}">Back to the session</a></p>
    </main>
  </body>
</html>
`;

// Participant labels are positional and derived at render time — first
// joiner is "Participant A", second "Participant B", and so on. We do
// not store the label.
const sortedParticipants = (session: Session): Array<Participant> =>
  [...session.participants].sort((a, b) => a.joinedAt - b.joinedAt);

const labelForIndex = (idx: number): string => {
  const letter =
    PARTICIPANT_LABEL_ALPHABET[idx] ??
    PARTICIPANT_LABEL_ALPHABET[PARTICIPANT_LABEL_ALPHABET.length - 1];
  return `Participant ${letter}`;
};

// Plain-text recap of a completed session. Pure function — used both for
// the clipboard-copy payload on the complete view and for any future
// take-away surface. Newlines are real `\n`, not HTML.
export const renderRecapText = (session: Session): string => {
  const ordered = sortedParticipants(session);
  const blocks = prompts.map((prompt, idx) => {
    const answersForPrompt = session.answers[prompt.id] ?? {};
    const lines = ordered.map((p, pIdx) => {
      const label = labelForIndex(pIdx);
      const raw = answersForPrompt[p.id];
      const answer =
        typeof raw === "string" && raw.trim() !== "" ? raw : "(no answer)";
      return `${label}: ${answer}`;
    });
    return [`Prompt ${idx + 1}: ${prompt.text}`, ...lines].join("\n");
  });
  const completedIso =
    session.completedAt !== null
      ? new Date(session.completedAt).toISOString()
      : new Date().toISOString();
  const footer = `Generated ${completedIso} from a Roundtable session. Roundtable does not provide financial, tax, legal, or investment advice.`;
  return [
    "Roundtable — conversation recap",
    "",
    blocks.join("\n\n"),
    "",
    footer,
  ].join("\n");
};

const submittedCountFor = (
  session: Session,
  promptId: string,
): number => {
  const answers = session.answers[promptId];
  if (answers === undefined) {
    return 0;
  }
  return session.participants.reduce((acc, p) => {
    if (typeof answers[p.id] === "string") {
      return acc + 1;
    }
    return acc;
  }, 0);
};

const renderWaitingForJoiner = (
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
    ${sharedFooter}
  </body>
</html>
`;
};

const renderAnswerView = (
  session: Session,
  prompt: Prompt,
): string => {
  const promptNumber = session.currentPromptIndex + 1;
  const total = prompts.length;
  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="5" />
    <title>Roundtable — prompt ${promptNumber} of ${total}</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <main>
      <p class="deck-meta">Prompt ${promptNumber} of ${total}</p>
      <p class="prompt">${escapeHtml(prompt.text)}</p>
      <form method="post" action="/s/${escapeHtml(session.code)}/answer">
        <input type="hidden" name="prompt_id" value="${escapeHtml(prompt.id)}" />
        <textarea name="text" maxlength="${MAX_ANSWER_LENGTH}" rows="6" required placeholder="Take your time. There's no right answer."></textarea>
        <p class="helper">Your partner won't see this until they've also submitted.</p>
        <button class="cta" type="submit">Submit privately</button>
      </form>
      <p><a class="back" href="/">Leave the session</a></p>
    </main>
    ${sharedFooter}
  </body>
</html>
`;
};

const renderWaitingForRevealView = (
  session: Session,
  prompt: Prompt,
): string => {
  const promptNumber = session.currentPromptIndex + 1;
  const total = prompts.length;
  const submitted = submittedCountFor(session, prompt.id);
  const totalParticipants = session.participants.length;
  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="5" />
    <title>Roundtable — waiting for the others</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <main>
      <p class="deck-meta">Prompt ${promptNumber} of ${total}</p>
      <p class="prompt">${escapeHtml(prompt.text)}</p>
      <h2>You've submitted. Waiting for the others.</h2>
      <p class="count">${submitted} of ${totalParticipants} have submitted</p>
      <p class="helper">This page will update on its own once everyone is in.</p>
      <p><a class="back" href="/">Leave the session</a></p>
    </main>
    ${sharedFooter}
  </body>
</html>
`;
};

const renderRevealView = (
  session: Session,
  prompt: Prompt,
): string => {
  const promptNumber = session.currentPromptIndex + 1;
  const total = prompts.length;
  const isLast = session.currentPromptIndex === prompts.length - 1;
  const advanceLabel = isLast ? "Finish" : "Move to the next prompt";
  const ordered = sortedParticipants(session);
  const answersForPrompt = session.answers[prompt.id] ?? {};
  const answerCards = ordered
    .map((p, idx) => {
      const text = answersForPrompt[p.id] ?? "";
      return `<div class="answer-card">
          <p class="label">${labelForIndex(idx)}</p>
          <p class="body">${escapeHtml(text)}</p>
        </div>`;
    })
    .join("\n        ");
  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roundtable — reveal</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <main>
      <p class="deck-meta">Prompt ${promptNumber} of ${total}</p>
      <p class="prompt">${escapeHtml(prompt.text)}</p>
      <h2>Both answers</h2>
      <div class="answers side-by-side">
        ${answerCards}
      </div>
      <p class="helper">Talk it through. When you're both ready, move on.</p>
      <form method="post" action="/s/${escapeHtml(session.code)}/next">
        <button class="cta" type="submit">${escapeHtml(advanceLabel)}</button>
      </form>
    </main>
    ${sharedFooter}
  </body>
</html>
`;
};

const renderCompleteView = (session: Session): string => {
  const ordered = sortedParticipants(session);
  const recap = prompts
    .map((prompt, idx) => {
      const answersForPrompt = session.answers[prompt.id] ?? {};
      const cards = ordered
        .map((p, pIdx) => {
          const text = answersForPrompt[p.id] ?? "";
          return `<div class="answer-card">
            <p class="label">${labelForIndex(pIdx)}</p>
            <p class="body">${escapeHtml(text)}</p>
          </div>`;
        })
        .join("\n          ");
      return `<section class="recap-item">
        <p class="deck-meta">Prompt ${idx + 1} of ${prompts.length}</p>
        <p class="prompt">${escapeHtml(prompt.text)}</p>
        <div class="answers side-by-side">
          ${cards}
        </div>
      </section>`;
    })
    .join("\n      ");
  // JSON-encode the plain-text recap so quotes and newlines survive the
  // drop into <script>. Escape `</` defensively so user content can't
  // break out of the script tag.
  const recapText = renderRecapText(session);
  const recapLiteral = JSON.stringify(recapText).replace(/<\//g, "<\\/");
  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roundtable — conversation complete</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <main>
      <h1>Conversation complete</h1>
      <p class="lede">
        That's the end of the deck. Roundtable doesn't keep a record
        beyond the next 24 hours.
      </p>
      <h2>What you talked through</h2>
      ${recap}
      <p class="takeaway">
        Sessions disappear after 24 hours. If you'd like to keep this
        conversation, you can copy it to your clipboard or print this
        page from your browser.
      </p>
      <div class="takeaway-actions">
        <button id="copy-recap" type="button">Copy to clipboard</button>
        <button id="print-recap" type="button">Print this page</button>
      </div>
      <textarea id="copy-recap-buffer" class="copy-buffer" readonly aria-hidden="true" tabindex="-1"></textarea>
      <p><a class="back" href="/">Back to the start</a></p>
    </main>
    ${sharedFooter}
    <script>
      (function () {
        var recapText = ${recapLiteral};
        var btn = document.getElementById("copy-recap");
        var printBtn = document.getElementById("print-recap");
        var buffer = document.getElementById("copy-recap-buffer");
        if (printBtn) {
          printBtn.addEventListener("click", function () {
            window.print();
          });
        }
        if (!btn) { return; }
        var defaultLabel = btn.textContent;
        function flash(label) {
          btn.textContent = label;
          setTimeout(function () { btn.textContent = defaultLabel; }, 1500);
        }
        function fallbackCopy() {
          if (!buffer) { return false; }
          buffer.value = recapText;
          buffer.removeAttribute("aria-hidden");
          buffer.focus();
          buffer.select();
          var ok = false;
          try {
            ok = document.execCommand("copy");
          } catch (e) {
            ok = false;
          }
          buffer.setAttribute("aria-hidden", "true");
          buffer.blur();
          return ok;
        }
        btn.addEventListener("click", function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(recapText).then(function () {
              flash("Copied");
            }, function () {
              if (fallbackCopy()) { flash("Copied"); } else { flash("Copy failed"); }
            });
          } else {
            if (fallbackCopy()) { flash("Copied"); } else { flash("Copy failed"); }
          }
        });
      })();
    </script>
  </body>
</html>
`;
};

const renderInsideView = (
  session: Session,
  participantId: string,
  origin: string,
): string => {
  if (session.completedAt !== null) {
    return renderCompleteView(session);
  }
  if (session.participants.length < SESSION_TARGET_PARTICIPANTS) {
    return renderWaitingForJoiner(session, origin);
  }
  const currentPrompt = prompts[session.currentPromptIndex];
  if (currentPrompt === undefined) {
    // Defensive — index past the deck without completedAt set. Treat as
    // complete so the participant doesn't see a broken view.
    return renderCompleteView(session);
  }
  const answersForPrompt = session.answers[currentPrompt.id] ?? {};
  const visitorHasSubmitted =
    typeof answersForPrompt[participantId] === "string";
  const everyoneSubmitted = session.participants.every(
    (p) => typeof answersForPrompt[p.id] === "string",
  );
  if (everyoneSubmitted) {
    return renderRevealView(session, currentPrompt);
  }
  if (!visitorHasSubmitted) {
    return renderAnswerView(session, currentPrompt);
  }
  return renderWaitingForRevealView(session, currentPrompt);
};

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

const readFormFields = async (
  request: Request,
): Promise<FormData> => request.formData();

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
      if (isParticipant && pid !== undefined) {
        return htmlResponse(
          renderInsideView(session, pid, requestOrigin(request)),
        );
      }
      return htmlResponse(renderJoinView(code));
    }

    if (rest === "/join" && method === "GET") {
      // The share URL we render to the host is `/s/<code>/join`, but the
      // canonical join surface is `/s/<code>`. When a real user clicks
      // (or pastes) the share link their browser issues a GET, which
      // would otherwise fall through to the 404 page. Redirect to the
      // canonical surface — no session lookup, no cookie work, just an
      // alias.
      return new Response(null, {
        status: 303,
        headers: { location: `/s/${code}` },
      });
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

    if (rest === "/answer" && method === "POST") {
      const cookies = parseCookies(request.headers.get("cookie"));
      const pid = cookies[PARTICIPANT_COOKIE];
      if (pid === undefined || pid === "") {
        return htmlResponse(
          renderActionErrorHtml(
            code,
            "We couldn't tell who you are in this session. Try opening the session link again.",
          ),
          { status: 400 },
        );
      }
      const form = await readFormFields(request);
      const promptId = form.get("prompt_id");
      const text = form.get("text");
      if (typeof promptId !== "string" || typeof text !== "string") {
        return htmlResponse(
          renderActionErrorHtml(
            code,
            "We didn't receive a complete answer. Please try again.",
          ),
          { status: 400 },
        );
      }
      const updated = await submitAnswer(
        env.SESSIONS,
        code,
        pid,
        promptId,
        text,
      );
      if (updated === null) {
        return htmlResponse(
          renderActionErrorHtml(
            code,
            "We couldn't save that answer. The reveal may already have happened, or the session may have moved on.",
          ),
          { status: 409 },
        );
      }
      const headers = new Headers();
      headers.set("location", `/s/${code}`);
      return new Response(null, { status: 303, headers });
    }

    if (rest === "/next" && method === "POST") {
      const cookies = parseCookies(request.headers.get("cookie"));
      const pid = cookies[PARTICIPANT_COOKIE];
      if (pid === undefined || pid === "") {
        return htmlResponse(
          renderActionErrorHtml(
            code,
            "We couldn't tell who you are in this session. Try opening the session link again.",
          ),
          { status: 400 },
        );
      }
      const updated = await advanceSession(env.SESSIONS, code, pid);
      if (updated === null) {
        return htmlResponse(
          renderActionErrorHtml(
            code,
            "We couldn't move on yet — not everyone has submitted, or the session has finished.",
          ),
          { status: 409 },
        );
      }
      const headers = new Headers();
      headers.set("location", `/s/${code}`);
      return new Response(null, { status: 303, headers });
    }
  }

  return htmlResponse(notFoundHtml, { status: 404 });
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
    ${sharedFooter}
  </body>
</html>
`;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env);
  },
} satisfies ExportedHandler<Env>;
