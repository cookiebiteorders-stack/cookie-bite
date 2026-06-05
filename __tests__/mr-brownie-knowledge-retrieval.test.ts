import { retrieveKnowledgeSnippets } from "@/lib/mr-brownie/brain/knowledge-retrieval";

describe("Mr. Brownie knowledge retrieval (keyword fallback)", () => {
  const faq = [
    {
      lang: "ar",
      question: "هل التوصيل مجاني؟",
      answer: "التوصيل مجاني للطلبات فوق 500 جنيه.",
    },
    {
      lang: "en",
      question: "Is delivery free?",
      answer: "Free delivery above 500 EGP.",
    },
  ];

  it("matches FAQ by Arabic keywords", () => {
    const hits = retrieveKnowledgeSnippets("متى يوصل التوصيل مجاني", faq);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.question).toContain("توصيل");
  });

  it("returns empty for unrelated query", () => {
    const hits = retrieveKnowledgeSnippets("ok", faq);
    expect(hits).toHaveLength(0);
  });
});
