type Wave = number[];
type FourierFn = (x: number, iterations: number) => number;

/**
 * @internal
 */
const createFourierSeries = (fn: FourierFn, size: number, iterations: number): Wave => {
  return new Array(size).fill(0).map((_, index) => fn((index / size) * Math.PI * 2, iterations));
};

/**
 * @internal
 */
const square: FourierFn = (x, iterations) => {
  let value = 0;

  for (let i = 0; i < iterations; i++) {
    const t = i * 2 + 1;

    value += Math.sin(t * x) / t;
  }

  return value;
};

export const squareWave = createFourierSeries(square, 100, 50);