/** @jest-environment node */
import { fetchJson } from "@/lib/http/fetch-json";

describe("fetchJson", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns parsed JSON on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, data: 1 }),
    });

    await expect(fetchJson<{ data: number }>("/api/x")).resolves.toEqual({
      ok: true,
      data: 1,
    });
  });

  it("throws on non-JSON body", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "not-json",
    });

    await expect(fetchJson("/bad")).rejects.toThrow("Non-JSON response");
  });

  it("throws readable message on API error JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({ error: { en: "Bad", ar: "سيء" }, ok: false }),
    });

    await expect(fetchJson("/bad")).rejects.toThrow("سيء");
  });
});
