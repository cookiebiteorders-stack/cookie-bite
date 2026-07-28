/** خيارات جلب JSON مع مهلة وزمن إعادة محاولة. */
export type FetchJsonOptions<TBody = unknown> = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  /** جسم الطلب؛ يُسلَّم كـ JSON تلقائياً مع Content-Type إن لم يكن معرَّفاً. */
  jsonBody?: TBody;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  if (init.signal) {
    return fetch(url, init);
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * طلب شبكة مع مهلة محدودة وتكرار انتقائي (شبكة 502/503/504 فقط افتراضياً).
 * لا يطبع أسرار؛ يمكن تمرير error كـ Cause في production logging الخارجي.
 */
export async function fetchJson<TResult>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<TResult> {
  const {
    timeoutMs = 20_000,
    retries = 0,
    retryDelayMs = 400,
    jsonBody,
    headers: hdrs,
    ...rest
  } = options;

  const headers = new Headers(hdrs ?? undefined);
  let body = rest.body;
  if (jsonBody !== undefined) {
    body = JSON.stringify(jsonBody);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const maxAttempts = 1 + Math.max(0, retries);

  const attemptOnce = async (attemptIndex: number): Promise<Response> => {
    try {
      const res = await fetchWithTimeout(
        url,
        { ...rest, headers, body },
        timeoutMs,
      );

      const retryableStatus =
        res.status === 408 ||
        res.status === 425 ||
        res.status === 429 ||
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504;

      if (retryableStatus && attemptIndex + 1 < maxAttempts) {
        await sleep(retryDelayMs);
        return attemptOnce(attemptIndex + 1);
      }
      return res;
    } catch (e) {
      if (attemptIndex + 1 < maxAttempts) {
        await sleep(retryDelayMs);
        return attemptOnce(attemptIndex + 1);
      }
      throw e;
    }
  };

  const res = await attemptOnce(0);

  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }

  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `انتهت جلسة الدخول — سجّل الدخول مجدداً (status ${res.status}) [SESSION_EXPIRED]`,
      );
    }
    throw new Error(
      `Expected JSON from ${url}, got invalid body (status ${res.status})`,
    );
  }

  if (!res.ok) {
    const errObj =
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as { error?: unknown }).error === "object"
        ? (parsed as { error?: { en?: string; ar?: string } }).error
        : undefined;

    let message =
      (typeof errObj?.ar === "string" && errObj.ar) ||
      (typeof errObj?.en === "string" && errObj.en) ||
      `Request failed (${res.status})`;

    const errorCode =
      typeof parsed === "object" &&
      parsed !== null &&
      "error_code" in parsed &&
      typeof (parsed as { error_code?: unknown }).error_code === "string"
        ? (parsed as { error_code: string }).error_code
        : null;

    const dbgRaw =
      typeof parsed === "object" &&
      parsed !== null &&
      "debug" in parsed
        ? (parsed as { debug?: unknown }).debug
        : null;
    const dbg =
      dbgRaw &&
      typeof dbgRaw === "object" &&
      "message" in dbgRaw &&
      typeof (dbgRaw as { message?: unknown }).message === "string"
        ? (dbgRaw as { message: string; hint?: string })
        : null;
    if (errorCode) {
      message = `${message} [${errorCode}]`;
    }
    if (dbg?.message) {
      message = `${message} — ${dbg.message}${dbg.hint ? ` (${dbg.hint})` : ""}`;
    }

    throw new Error(message);
  }

  return parsed as TResult;
}
