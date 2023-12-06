export function timeSince(time: number) {
  return Date.now() - time;
}

export function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}

export function mod(a: number, m: number): number {
  return ((a % m) + m) % m;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}