/** RAG-lite: keyword match على FAQ بدون pgvector */
export function retrieveKnowledgeSnippets(
  query: string,
  faq: Array<{ question: string; answer: string; lang: string }>,
  limit = 4,
): Array<{ question: string; answer: string; lang: string }> {
  const q = query.trim().toLowerCase();
  if (!q || !faq.length) return [];

  const tokens = q.split(/\s+/).filter((t) => t.length > 2);
  if (!tokens.length) return [];

  const scored = faq.map((entry) => {
    const hay = `${entry.question} ${entry.answer}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += 2;
    }
    return { entry, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => ({
      question: x.entry.question,
      answer: x.entry.answer,
      lang: x.entry.lang,
    }));
}
