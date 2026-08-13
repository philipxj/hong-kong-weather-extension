export interface ImageryPosition {
  index: number;
  count: number;
}

export interface ImageryAutoplayStep {
  direction: -1 | 1;
  steps: number;
}

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
