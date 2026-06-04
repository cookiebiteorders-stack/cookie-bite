/** يضغط نافذة المحادثة — آخر N تبادلات فقط (يمنع التوهان) */
const MAX_TURNS = 5;
const MAX_CHARS_PER_MSG = 280;

export function buildConversationWindowSummary(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): {
  recent_turns: Array<{ role: string; excerpt: string }>;
  summary: string;
} {
  const pairs: Array<{ role: string; excerpt: string }> = [];
  for (const m of messages.slice(-MAX_TURNS * 2)) {
    const excerpt = m.content.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS_PER_MSG);
    if (excerpt) pairs.push({ role: m.role, excerpt });
  }

  const userTopics = pairs
    .filter((p) => p.role === "user")
    .map((p) => p.excerpt)
    .join(" | ");

  const summary =
    pairs.length === 0
      ? "New conversation."
      : `Last ${Math.min(MAX_TURNS, pairs.length)} messages. User topics: ${userTopics.slice(0, 400)}`;

  return { recent_turns: pairs.slice(-MAX_TURNS * 2), summary };
}
