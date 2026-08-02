import "@testing-library/jest-dom";

if (typeof globalThis.fetch === "undefined") {
  globalThis.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      headers: {
        get: () => null,
      },
    }),
  ) as unknown as typeof fetch;
}
