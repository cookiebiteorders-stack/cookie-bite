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
});
