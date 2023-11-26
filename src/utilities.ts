export function timeSince(time: number) {
  return Date.now() - time;
}

export function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}