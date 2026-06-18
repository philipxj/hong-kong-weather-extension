import { describe, expect, test, vi } from "vitest";
import { createInFlightTaskRunner } from "../src/shared/in-flight-task";

describe("in-flight task runner", () => {
  test("shares simultaneous work for the same key", async () => {
    const run = createInFlightTaskRunner<string>();
    const task = vi.fn(() => Promise.resolve("weather"));

    const [first, second] = await Promise.all([
      run("full-refresh", task),
      run("full-refresh", task)
    ]);

    expect(first).toBe("weather");
    expect(second).toBe("weather");
    expect(task).toHaveBeenCalledOnce();
  });

  test("keeps different keys independent", async () => {
    const run = createInFlightTaskRunner<string>();
    const task = vi.fn((value: string) => Promise.resolve(value));

    await Promise.all([
      run("current", () => task("current")),
      run("warnings", () => task("warnings"))
    ]);

    expect(task).toHaveBeenCalledTimes(2);
  });
});
