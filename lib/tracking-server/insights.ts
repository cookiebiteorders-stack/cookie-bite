import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getDevicesBreakdown,
  getOverview,
  getReferrersBreakdown,
  getTopPages,
  type Range,
} from "./queries";
import { computeFunnel, listFunnels } from "./funnels";

import type { FunnelStepResult } from "./funnels";

export interface InsightsBundle {
  range: Range;
  generated_at: string;
  source: "gemini" | "openai" | "rules";
  summary: string;
  highlights: string[];
  warnings: string[];
  recommendations: string[];
  data: {
    overview: Awaited<ReturnType<typeof getOverview>>;
    pages: Awaited<ReturnType<typeof getTopPages>>;
    devices: Awaited<ReturnType<typeof getDevicesBreakdown>>;
    referrers: Awaited<ReturnType<typeof getReferrersBreakdown>>;
    funnels: Array<{ slug: string; name: string; steps: FunnelStepResult[] }>;
  };
}

const SYSTEM_PROMPT = `You are an analytics co-pilot for a Cookie Bite e-commerce store.
You receive a JSON snapshot of the last analytics window and must return a JSON object with the
following shape:
{
  "summary": "string (3-4 short sentences, neutral tone, no emojis)",
  "highlights": ["bullets describing the most important wins"],
  "warnings":   ["bullets describing risks/anomalies"],
  "recommendations": ["bullets with concrete next steps the team can take this week"]
}
Numbers must come from the snapshot. Do not invent metrics. Keep each bullet under 24 words.`;

async function callGemini(payload: object): Promise<Partial<InsightsBundle> | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: process.env.MR_BROWNIE_GEMINI_MODEL?.trim() || "gemini-flash-latest",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
      },
    });
    const result = await model.generateContent([
      { text: `Snapshot:\n${JSON.stringify(payload)}` },
    ]);
    const text = result.response.text();
    if (!text) return null;
    return JSON.parse(text) as Partial<InsightsBundle>;
  } catch (e) {
    console.warn("[insights] gemini failed", e);
    return null;
  }
}

async function callOpenAI(payload: object): Promise<Partial<InsightsBundle> | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: key });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_INSIGHTS_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Snapshot:\n${JSON.stringify(payload)}` },
      ],
    });
    const text = response.choices?.[0]?.message?.content;
    if (!text) return null;
    return JSON.parse(text) as Partial<InsightsBundle>;
  } catch (e) {
    console.warn("[insights] openai failed", e);
    return null;
  }
}

function rulesEngine(data: InsightsBundle["data"]): Partial<InsightsBundle> {
  const highlights: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const { overview, pages, devices, funnels } = data;
  if (overview.visitors > 0) {
    highlights.push(`${overview.visitors.toLocaleString()} visitors across ${overview.sessions.toLocaleString()} sessions.`);
  }
  if (overview.conversion_rate >= 0.02) {
    highlights.push(`Healthy conversion rate at ${(overview.conversion_rate * 100).toFixed(1)}%.`);
  } else if (overview.sessions > 100 && overview.conversion_rate < 0.005) {
    warnings.push(`Conversion rate is below 0.5% — investigate the checkout funnel.`);
  }
  if (overview.bounce_rate > 0.65) {
    warnings.push(`Bounce rate is ${(overview.bounce_rate * 100).toFixed(1)}% — landing pages may need attention.`);
  }
  if (pages.length > 0) {
    highlights.push(`Top page: ${pages[0].path} (${pages[0].views} views).`);
  }
  if (devices.devices.length > 0) {
    const top = devices.devices[0];
    highlights.push(`Most visitors are on ${top.name} (${top.value} sessions).`);
  }
  for (const f of funnels) {
    if (f.steps.length === 0) continue;
    const last = f.steps[f.steps.length - 1];
    if (last.conversion_pct < 0.05 && f.steps[0].visitors > 50) {
      warnings.push(`${f.name}: only ${(last.conversion_pct * 100).toFixed(1)}% reach the final step.`);
    }
  }
  if (warnings.length === 0 && highlights.length > 0) {
    recommendations.push("Keep monitoring — no critical anomalies in this window.");
  } else if (warnings.length > 0) {
    recommendations.push("Prioritise fixing the warnings above before launching new campaigns.");
  }

  return {
    summary:
      highlights.length === 0
        ? "Not enough traffic yet to generate insights — keep the tracker running and revisit soon."
        : highlights.slice(0, 2).join(" "),
    highlights,
    warnings,
    recommendations,
  };
}

export async function generateInsights(range: Range = "7d"): Promise<InsightsBundle> {
  const [overview, pages, devices, referrers, funnelList] = await Promise.all([
    getOverview(range),
    getTopPages(range, 10),
    getDevicesBreakdown(range),
    getReferrersBreakdown(range),
    listFunnels(),
  ]);

  const funnels = await Promise.all(
    funnelList.slice(0, 3).map(async (f) => {
      const computation = await computeFunnel(f.slug, range);
      return { slug: f.slug, name: f.name, steps: computation?.steps ?? [] };
    }),
  );

  const data: InsightsBundle["data"] = { overview, pages, devices, referrers, funnels };
  const snapshot = {
    range,
    overview,
    top_pages: pages,
    devices: devices.devices,
    browsers: devices.browsers.slice(0, 6),
    referrers: referrers.slice(0, 10),
    funnels,
  };

  let llm: Partial<InsightsBundle> | null = await callGemini(snapshot);
  let source: InsightsBundle["source"] = "gemini";
  if (!llm) {
    llm = await callOpenAI(snapshot);
    source = "openai";
  }
  if (!llm) {
    llm = rulesEngine(data);
    source = "rules";
  }

  return {
    range,
    generated_at: new Date().toISOString(),
    source,
    summary: llm.summary ?? "",
    highlights: Array.isArray(llm.highlights) ? llm.highlights.slice(0, 10) : [],
    warnings: Array.isArray(llm.warnings) ? llm.warnings.slice(0, 10) : [],
    recommendations: Array.isArray(llm.recommendations)
      ? llm.recommendations.slice(0, 10)
      : [],
    data,
  };
}
