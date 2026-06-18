export function createInFlightTaskRunner<TResult>() {
  const inFlight = new Map<string, Promise<TResult>>();

  return (key: string, task: () => Promise<TResult>): Promise<TResult> => {
    const existing = inFlight.get(key);
    if (existing) return existing;

    const next = task().finally(() => {
      if (inFlight.get(key) === next) {
        inFlight.delete(key);
      }
    });
    inFlight.set(key, next);
    return next;
  };
}
