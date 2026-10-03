export interface ImageryPosition {
  index: number;
  count: number;
}

export interface ImageryAutoplayStep {
  direction: -1 | 1;
  steps: number;
}

export interface ImageryPlaybackState {
  explicitlyPaused: boolean;
  reducedMotion: boolean;
  reducedMotionOverride: boolean;
}

export type ImageryPlaybackAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "motion-change"; reducedMotion: boolean };

export function parseImageryPosition(value: string): ImageryPosition | null {
  const match = value.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;

  const index = Number(match[1]);
  const count = Number(match[2]);
  if (!Number.isInteger(index) || !Number.isInteger(count) || count < 2) return null;
  if (index < 1 || index > count) return null;

  return { index, count };
}

export function imageryAutoplayStep(position: ImageryPosition): ImageryAutoplayStep {
  if (position.index < position.count) {
    return { direction: 1, steps: 1 };
  }

  return { direction: -1, steps: position.count - 1 };
}

export function imagerySliderStep(
  position: ImageryPosition,
  targetIndex: number
): ImageryAutoplayStep | null {
  if (!Number.isInteger(targetIndex) || targetIndex < 1 || targetIndex > position.count) {
    return null;
  }

  const steps = Math.abs(targetIndex - position.index);
  if (steps === 0) return null;

  return {
    direction: targetIndex < position.index ? -1 : 1,
    steps
  };
}

export function initialImageryPlaybackState(reducedMotion: boolean): ImageryPlaybackState {
  return {
    explicitlyPaused: false,
    reducedMotion,
    reducedMotionOverride: false
  };
}

export function reduceImageryPlaybackState(
  state: ImageryPlaybackState,
  action: ImageryPlaybackAction
): ImageryPlaybackState {
  if (action.type === "play") {
    return {
      ...state,
      explicitlyPaused: false,
      reducedMotionOverride: state.reducedMotion
    };
  }

  if (action.type === "pause") {
    return {
      ...state,
      explicitlyPaused: true,
      reducedMotionOverride: false
    };
  }

  if (action.reducedMotion === state.reducedMotion && !state.reducedMotionOverride) return state;
  return {
    ...state,
    reducedMotion: action.reducedMotion,
    reducedMotionOverride: false
  };
}

export function canRunImageryPlayback(state: ImageryPlaybackState): boolean {
  return (
    !state.explicitlyPaused &&
    (!state.reducedMotion || state.reducedMotionOverride)
  );
}

export function imageryManualResumeDelay(): number {
  return 3000;
}
