type FourierFn = (x: number, iterations: number) => number;

export type WaveForm = number[];

/**
 * @internal
 */
const createSampleWaveForm = (fn: FourierFn, size: number, iterations: number): WaveForm => {
  return new Array(size).fill(0).map((_, index) => fn((index / size) * Math.PI * 2, iterations));
};

/**
 * @internal
 */
const sine: FourierFn = x => Math.sin(x);

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

export const samples = {
  sine: createSampleWaveForm(sine, 100, 50),
  square: createSampleWaveForm(square, 100, 50)
};