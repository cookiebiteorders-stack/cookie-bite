import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export interface RecordingFrame {
  t: number;
  type: "move" | "click" | "scroll" | "nav";
  x?: number;
  y?: number;
  path?: string;
}

export interface RecordingSummary {
  session_id: string;
  visitor_id: string;
  started_at: string;
  last_event_at: string;
  duration_seconds: number;
  frame_count: number;
  device_type: string | null;
  country: string | null;
  entry_page: string | null;
  exit_page: string | null;
}

const FRAMES_LIMIT = 5000;

export async function listRecordings(limit = 30): Promise<RecordingSummary[]> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tracking_events")
    .select("session_id, visitor_id, occurred_at, properties")
    .eq("name", "replay_chunk")
    .order("occurred_at", { ascending: false })
    .limit(limit * 20);
  if (!data || data.length === 0) return [];

  const bySession = new Map<
    string,
    { visitor_id: string; first: number; last: number; frames: number }
  >();
  for (const row of data) {
    const props = (row.properties as Record<string, unknown>) ?? {};
    const frames = Array.isArray(props.frames) ? (props.frames as RecordingFrame[]) : [];
    const ts = new Date(row.occurred_at as string).getTime();
    const id = String(row.session_id);
    const existing = bySession.get(id);
    if (existing) {
      existing.first = Math.min(existing.first, ts);
      existing.last = Math.max(existing.last, ts);
      existing.frames += frames.length;
    } else {
      bySession.set(id, {
        visitor_id: String(row.visitor_id),
        first: ts,
        last: ts,
        frames: frames.length,
      });
    }
  }

  const sessionIds = Array.from(bySession.keys()).slice(0, limit);
  if (sessionIds.length === 0) return [];
  const { data: sessions } = await supabase
    .from("tracking_sessions")
    .select("session_id, device_type, country, entry_page, exit_page")
    .in("session_id", sessionIds);

  const sessionMap = new Map<string, Record<string, unknown>>();
  for (const row of sessions ?? []) {
    sessionMap.set(String(row.session_id), row as Record<string, unknown>);
  }

  return sessionIds.map((id) => {
    const meta = bySession.get(id)!;
    const sessionRow = sessionMap.get(id);
    return {
      session_id: id,
      visitor_id: meta.visitor_id,
      started_at: new Date(meta.first).toISOString(),
      last_event_at: new Date(meta.last).toISOString(),
      duration_seconds: Math.round((meta.last - meta.first) / 1000),
      frame_count: meta.frames,
      device_type: (sessionRow?.device_type as string | null) ?? null,
      country: (sessionRow?.country as string | null) ?? null,
      entry_page: (sessionRow?.entry_page as string | null) ?? null,
      exit_page: (sessionRow?.exit_page as string | null) ?? null,
    };
  });
}

export async function getRecordingFrames(sessionId: string): Promise<RecordingFrame[]> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tracking_events")
    .select("properties, occurred_at")
    .eq("session_id", sessionId)
    .eq("name", "replay_chunk")
    .order("occurred_at", { ascending: true })
    .limit(500);
  const frames: RecordingFrame[] = [];
  for (const row of data ?? []) {
    const props = (row.properties as Record<string, unknown>) ?? {};
    const chunk = Array.isArray(props.frames) ? (props.frames as RecordingFrame[]) : [];
    for (const frame of chunk) {
      if (frames.length >= FRAMES_LIMIT) break;
      frames.push(frame);
    }
    if (frames.length >= FRAMES_LIMIT) break;
  }
  return frames;
}
