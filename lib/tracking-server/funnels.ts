import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeToCutoff, type Range } from "./queries";

export interface FunnelStep {
  name: string;
  event: string;
  match?: {
    path?: string;
    properties?: Record<string, unknown>;
  };
}

export interface Funnel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  steps: FunnelStep[];
  is_active: boolean;
}

export interface FunnelStepResult {
  index: number;
  name: string;
  event: string;
  visitors: number;
  conversion_pct: number;
  drop_off_pct: number;
}

export interface FunnelComputation {
  funnel: Funnel;
  range: Range;
  total_visitors: number;
  steps: FunnelStepResult[];
}

export async function listFunnels(): Promise<Funnel[]> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tracking_funnels")
    .select("id, slug, name, description, steps, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  return (data ?? []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    steps: Array.isArray(row.steps) ? (row.steps as FunnelStep[]) : [],
    is_active: Boolean(row.is_active),
  }));
}

export async function getFunnel(slug: string): Promise<Funnel | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("tracking_funnels")
    .select("id, slug, name, description, steps, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return {
    id: String(data.id),
    slug: String(data.slug),
    name: String(data.name),
    description: (data.description as string | null) ?? null,
    steps: Array.isArray(data.steps) ? (data.steps as FunnelStep[]) : [],
    is_active: Boolean(data.is_active),
  };
}

function matchesStep(
  event: { name: string; path?: string | null; properties?: Record<string, unknown> | null },
  step: FunnelStep,
): boolean {
  if (event.name !== step.event) return false;
  const match = step.match;
  if (!match) return true;
  if (match.path && event.path !== match.path) return false;
  if (match.properties) {
    const props = event.properties ?? {};
    for (const [key, value] of Object.entries(match.properties)) {
      if (props[key] !== value) return false;
    }
  }
  return true;
}

export async function computeFunnel(
  slug: string,
  range: Range = "30d",
): Promise<FunnelComputation | null> {
  const funnel = await getFunnel(slug);
  if (!funnel || funnel.steps.length === 0) return null;
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    return {
      funnel,
      range,
      total_visitors: 0,
      steps: funnel.steps.map((step, idx) => ({
        index: idx,
        name: step.name,
        event: step.event,
        visitors: 0,
        conversion_pct: 0,
        drop_off_pct: 0,
      })),
    };
  }

  const eventNames = Array.from(new Set(funnel.steps.map((s) => s.event)));
  const { data } = await supabase
    .from("tracking_events")
    .select("visitor_id, name, path, occurred_at, properties")
    .gte("occurred_at", rangeToCutoff(range))
    .in("name", eventNames)
    .order("occurred_at", { ascending: true })
    .limit(200_000);

  const visitorProgress = new Map<string, number>();
  for (const row of data ?? []) {
    const visitor = String(row.visitor_id);
    const event = {
      name: String(row.name),
      path: (row.path as string | null) ?? null,
      properties: (row.properties as Record<string, unknown> | null) ?? null,
    };
    const current = visitorProgress.get(visitor) ?? 0;
    const expectedStep = funnel.steps[current];
    if (!expectedStep) continue;
    if (matchesStep(event, expectedStep)) {
      visitorProgress.set(visitor, current + 1);
    }
  }

  const totals = funnel.steps.map(() => 0);
  for (const reached of visitorProgress.values()) {
    for (let i = 0; i < reached; i += 1) totals[i] += 1;
  }
  const totalVisitors = totals[0] ?? 0;

  const steps: FunnelStepResult[] = funnel.steps.map((step, idx) => {
    const visitors = totals[idx] ?? 0;
    const previous = idx === 0 ? totalVisitors : totals[idx - 1] ?? 0;
    const conversion_pct = totalVisitors ? +(visitors / totalVisitors).toFixed(4) : 0;
    const drop_off_pct = previous
      ? +(Math.max(0, previous - visitors) / previous).toFixed(4)
      : 0;
    return {
      index: idx,
      name: step.name,
      event: step.event,
      visitors,
      conversion_pct,
      drop_off_pct,
    };
  });

  return { funnel, range, total_visitors: totalVisitors, steps };
}
