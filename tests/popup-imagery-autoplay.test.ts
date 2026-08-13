import { describe, expect, test } from "vitest";

import { imageryAutoplayStep, parseImageryPosition } from "../src/popup/imagery-autoplay";

describe("popup imagery autoplay", () => {
  test("parses the compact imagery position counter", () => {
    expect(parseImageryPosition("3 / 5")).toEqual({ index: 3, count: 5 });
  });

  test("rejects invalid or non-playable counters", () => {
    expect(parseImageryPosition("-- / --")).toBeNull();
    expect(parseImageryPosition("1 / 1")).toBeNull();
    expect(parseImageryPosition("6 / 5")).toBeNull();
  });

  test("advances one frame while the sequence has a next frame", () => {
    expect(imageryAutoplayStep({ index: 3, count: 5 })).toEqual({
      direction: 1,
      steps: 1
    });
  });

  test("wraps from the last frame back to the first frame", () => {
    expect(imageryAutoplayStep({ index: 5, count: 5 })).toEqual({
      direction: -1,
      steps: 4
    });
  });
});
