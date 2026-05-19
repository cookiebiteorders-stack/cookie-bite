import { normalizeEgyptPhone } from "@/lib/whatsapp/phone";

export type BridgeSendResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  mode: "bridge";
};

function bridgeConfig() {
  const base = process.env.WHATSAPP_BRIDGE_URL?.trim().replace(/\/$/, "");
  const secret = process.env.WHATSAPP_BRIDGE_SECRET?.trim();
  return { base, secret };
}

export function isWhatsAppBridgeConfigured(): boolean {
  return Boolean(bridgeConfig().base);
}

/**
 * POST to a bridge route, e.g. `/send/order-confirm`.
 * Phone may be E.164 (20…) or local 01… — normalized for the bridge.
 */
export async function postWhatsAppBridge(
  route: string,
  payload: Record<string, unknown>,
): Promise<BridgeSendResult> {
  const { base, secret } = bridgeConfig();
  if (!base) {
    return { ok: false, skipped: true, error: "WhatsApp bridge not configured", mode: "bridge" };
  }

  const phone = payload.phone;
  if (typeof phone === "string") {
    const normalized = normalizeEgyptPhone(phone);
    if (normalized) payload = { ...payload, phone: normalized };
  }

  const path = route.startsWith("/") ? route : `/${route}`;
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-bridge-secret": secret } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25_000),
    });

    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      error?: string;
    } | null;

    if (!res.ok) {
      return {
        ok: false,
        error: data?.error ?? `Bridge HTTP ${res.status}`,
        mode: "bridge",
      };
    }

    if (data?.success === false) {
      return { ok: false, error: data.error ?? "Bridge send failed", mode: "bridge" };
    }

    return { ok: true, mode: "bridge" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bridge request failed";
    return { ok: false, error: message, mode: "bridge" };
  }
}

export async function getWhatsAppBridgeStatus(): Promise<{
  ok: boolean;
  connected?: boolean;
  error?: string;
}> {
  const { base, secret } = bridgeConfig();
  if (!base) return { ok: false, error: "not configured" };
  try {
    const res = await fetch(`${base}/status`, {
      headers: secret ? { "x-bridge-secret": secret } : undefined,
      signal: AbortSignal.timeout(8_000),
    });
    const data = (await res.json()) as { whatsapp?: string };
    return { ok: res.ok, connected: data.whatsapp === "connected" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "status failed" };
  }
}
