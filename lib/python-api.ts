/**
 * Helpers for the Python microservices layer (proxied at /api/python/*).
 * Set PYTHON_API_URL=http://127.0.0.1:8000 in .env when running docker compose.
 */

const PYTHON_PREFIX = "/api/python";

export function pythonApiAvailable(): boolean {
  return Boolean(process.env.PYTHON_API_URL?.trim());
}

export function pythonApiPath(path: string): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${PYTHON_PREFIX}/${normalized}`;
}

/** Server-side health check (used in admin settings later). */
export async function fetchPythonHealth(): Promise<{
  ok: boolean;
  data?: unknown;
}> {
  const base = process.env.PYTHON_API_URL?.trim();
  if (!base) return { ok: false };

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { ok: false };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false };
  }
}
