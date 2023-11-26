export function timeSince(time: number) {
  return Date.now() - time;
}

export function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}

export function mod(a: number, m: number): number {
  return ((a % m) + m) % m;
}