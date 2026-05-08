/** @jest-environment node */
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

describe("scheduleEffectTask", () => {
  it("schedules work and supports cancel", async () => {
    const raf = jest.fn((cb: FrameRequestCallback) => {
      void Promise.resolve().then(() => cb(0));
      return 42;
    });
    const caf = jest.fn();
    global.requestAnimationFrame = raf;
    global.cancelAnimationFrame = caf;

    const spy = jest.fn();
    const cancel = scheduleEffectTask(spy);

    await flushPromises();

    expect(spy).toHaveBeenCalledTimes(1);
    cancel();
    expect(caf).toHaveBeenCalledWith(42);
  });
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((r) => setImmediate(r));
}
