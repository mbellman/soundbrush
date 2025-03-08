type WaveFn = (x: number) => number;

export type WaveForm = number[];

/**
 * @internal
 */
const createSampleWaveForm = (size: number, fn: WaveFn): WaveForm => {
  return new Array(size).fill(0).map((_, index) => fn((index / size) * Math.PI * 2));
};

export const samples = {
  sine: createSampleWaveForm(100, x => Math.sin(x)),
  square: [
    ...new Array(50).fill(1),
    ...new Array(50).fill(-1)
  ] as WaveForm,
  triangle: createSampleWaveForm(100, x => x < 50 ? x / 50 : 1 - (x - 50) / 50)
};

export type Instrument = keyof typeof samples;
