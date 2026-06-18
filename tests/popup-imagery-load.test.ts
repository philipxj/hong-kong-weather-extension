import { describe, expect, test, vi } from "vitest";
import { createInFlightTaskRunner } from "../src/shared/in-flight-task";

describe("popup imagery loading", () => {
  test("shares metadata loading across cached and refreshed renders", async () => {
    const runImageryLoad = createInFlightTaskRunner<void>();
    const loadMetadata = vi.fn(() => Promise.resolve());

    await Promise.all([
      runImageryLoad("popup-imagery", loadMetadata),
      runImageryLoad("popup-imagery", loadMetadata)
    ]);

    expect(loadMetadata).toHaveBeenCalledOnce();
  });
});
