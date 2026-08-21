import { describe, expect, test } from "vitest";

import {
  canRunImageryPlayback,
  imageryAutoplayStep,
  imageryManualResumeDelay,
  imagerySliderStep,
  initialImageryPlaybackState,
  parseImageryPosition,
  reduceImageryPlaybackState
} from "../src/popup/imagery-autoplay";

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

  test("turns a slider target into the shortest direct frame step", () => {
    expect(imagerySliderStep({ index: 2, count: 5 }, 5)).toEqual({
      direction: 1,
      steps: 3
    });
    expect(imagerySliderStep({ index: 5, count: 5 }, 2)).toEqual({
      direction: -1,
      steps: 3
    });
    expect(imagerySliderStep({ index: 3, count: 5 }, 3)).toBeNull();
    expect(imagerySliderStep({ index: 3, count: 5 }, 6)).toBeNull();
  });

  test("keeps explicit pause persistent while manual playback can resume", () => {
    const initial = initialImageryPlaybackState(false);
    expect(canRunImageryPlayback(initial)).toBe(true);

    const paused = reduceImageryPlaybackState(initial, { type: "pause" });
    expect(canRunImageryPlayback(paused)).toBe(false);
    expect(reduceImageryPlaybackState(paused, { type: "motion-change", reducedMotion: false })).toEqual(
      paused
    );

    const playing = reduceImageryPlaybackState(paused, { type: "play" });
    expect(canRunImageryPlayback(playing)).toBe(true);
  });

  test("starts paused for reduced motion but allows an explicit play override", () => {
    const reduced = initialImageryPlaybackState(true);
    expect(canRunImageryPlayback(reduced)).toBe(false);

    const optedIn = reduceImageryPlaybackState(reduced, { type: "play" });
    expect(canRunImageryPlayback(optedIn)).toBe(true);

    const motionChanged = reduceImageryPlaybackState(optedIn, {
      type: "motion-change",
      reducedMotion: true
    });
    expect(canRunImageryPlayback(motionChanged)).toBe(false);
  });

  test("resumes automatic playback three seconds after manual interaction", () => {
    expect(imageryManualResumeDelay()).toBe(3000);
  });
});
