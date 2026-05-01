const html = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roundtable — a guided money conversation for households</title>
    <style>
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
      p.lede {
        font-size: 1.15rem;
        margin: 0 0 2rem;
      }
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
    </style>
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
      <a class="cta" href="/s/new" role="button">Start a session</a>
    </main>
    <footer>
      Roundtable does not provide financial, tax, legal, or investment
      advice. Nothing is saved yet — anything you type stays in this
      browser session and is lost when you close the tab.
    </footer>
  </body>
</html>
`;

const stubSessionHtml = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Roundtable — new session</title>
    <style>
      body {
        font-family: ui-serif, Georgia, serif;
        background: #f6f3ee;
        color: #1a1a1a;
        max-width: 32rem;
        margin: 4rem auto;
        padding: 0 1.5rem;
        line-height: 1.55;
      }
      a { color: #2f4f3f; }
    </style>
  </head>
  <body>
    <h1>Session — coming next</h1>
    <p>
      The session flow is not built yet. This page is a placeholder so
      the call-to-action goes somewhere honest.
    </p>
    <p><a href="/">Back to the start</a></p>
  </body>
</html>
`;

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    if (url.pathname === "/s/new") {
      return new Response(stubSessionHtml, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
} satisfies ExportedHandler;
