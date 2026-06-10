// Typed contract for the editor feedback surface. Matches the backend the
// adjacent agent ships at POST /api/feedback. Three kinds:
// - thumbs: per-agent-message and per-build-summary up/down
// - nps: a single "0-10 recommend?" prompt, fired once per user
// - free_text: open-ended notes from anywhere in the editor

export type ThumbsTargetType = "agent_message" | "agent_build_summary";

export type ThumbsVerdict = "up" | "down";

export type ThumbsFeedback = {
  kind: "thumbs";
  targetType: ThumbsTargetType;
  targetId: string;
  conversationId: string;
  turnId: string;
  verdict: ThumbsVerdict;
  note?: string;
};

export type NpsFeedback = {
  kind: "nps";
  // Inclusive 0..10. The client clamps before send.
  score: number;
  note?: string;
};

export type FreeTextFeedback = {
  kind: "free_text";
  surface: string;
  text: string;
};

export type FeedbackBody = ThumbsFeedback | NpsFeedback | FreeTextFeedback;

export type FeedbackResponse = { ok: true } | { ok: false; error: string };
