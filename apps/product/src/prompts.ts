// The MVP prompt deck. Wording, IDs, and order are dictated by the
// decision-log entry dated 2026-05-01 02:35 — copy verbatim, do not
// paraphrase or reorder. The exact array shape (id + text) is the
// load-bearing contract; future copy revisions are one-commit changes
// but the IDs survive so any stored answers stay addressable.

export type Prompt = { id: string; text: string };

export const prompts: ReadonlyArray<Prompt> = [
  {
    id: "values-enough",
    text: "What does 'enough' mean to each of us, in three years' time?",
  },
  {
    id: "history-belief",
    text: "What's something about money you grew up believing that you've since changed your mind about — or are starting to?",
  },
  {
    id: "recent-decision",
    text: "Think of a money decision we (or you) made in the last year. What feels good about it now? What feels less good?",
  },
  {
    id: "shared-costs",
    text: "When it comes to how we split or share costs at the moment, what feels fair to you, and what doesn't?",
  },
  {
    id: "unexpected",
    text: "If something unexpected happened that felt financially significant — whatever 'significant' means to us — what's the first thing each of us would worry about?",
  },
];
