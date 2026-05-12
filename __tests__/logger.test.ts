/** @jest-environment node */
import { logStructuredError } from "@/lib/logger";

describe("logStructuredError", () => {
  it("redacts sensitive keys in context", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    logStructuredError("test", new Error("boom"), {
      token: "secret",
      safe: "ok",
      nested: { Authorization: "bear" },
    });

    const payload = JSON.parse((spy.mock.calls[0][0] as string) ?? "{}");
    expect(payload.context.safe).toBe("ok");
    expect(payload.context.token).toBe("[redacted]");
    expect(payload.context.nested.Authorization).toBe("[redacted]");
    spy.mockRestore();
  });

  it("includes correlationId when provided", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    logStructuredError("test", new Error("boom"), { correlationId: "req-1", safe: "ok" });

    const payload = JSON.parse((spy.mock.calls[0][0] as string) ?? "{}");
    expect(payload.correlationId).toBe("req-1");
    expect(payload.context?.safe).toBe("ok");
    expect(payload.context).not.toHaveProperty("correlationId");
    spy.mockRestore();
  });

  it("POSTs to webhook when COOKIE_BITE_LOG_WEBHOOK_URL is https", async () => {
    const prev = process.env.COOKIE_BITE_LOG_WEBHOOK_URL;
    process.env.COOKIE_BITE_LOG_WEBHOOK_URL = "https://hooks.example.test/log";

    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    logStructuredError("webhook-test", new Error("x"), { ok: 1 });

    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.method).toBe("POST");
    const posted = JSON.parse(String((init as RequestInit).body));

    expect(posted.scope).toBe("webhook-test");
    expect(posted.context.ok).toBe(1);

    consoleSpy.mockRestore();
    fetchSpy.mockRestore();
    if (prev === undefined) delete process.env.COOKIE_BITE_LOG_WEBHOOK_URL;
    else process.env.COOKIE_BITE_LOG_WEBHOOK_URL = prev;
  });
});
