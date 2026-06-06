/** @jest-environment node */

describe("background worker scheduler", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("enables workers in production by default", async () => {
    process.env = { ...originalEnv, NODE_ENV: "production" };
    delete process.env.BACKGROUND_WORKERS_ENABLED;
    const { isBackgroundWorkersEnabled } = await import("@/lib/background/worker-scheduler");
    expect(isBackgroundWorkersEnabled()).toBe(true);
  });

  it("disables workers in development unless forced", async () => {
    process.env = { ...originalEnv, NODE_ENV: "development" };
    delete process.env.BACKGROUND_WORKERS_ENABLED;
    const { isBackgroundWorkersEnabled } = await import("@/lib/background/worker-scheduler");
    expect(isBackgroundWorkersEnabled()).toBe(false);
  });

  it("respects BACKGROUND_WORKERS_ENABLED=false", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      BACKGROUND_WORKERS_ENABLED: "false",
    };
    const { isBackgroundWorkersEnabled } = await import("@/lib/background/worker-scheduler");
    expect(isBackgroundWorkersEnabled()).toBe(false);
  });
});
