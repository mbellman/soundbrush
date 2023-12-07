import { clearCanvas } from './canvas';
import type { Sound } from './audio';
import * as audio from './audio';
import { MIDDLE_NOTE } from './constants';
import { Vec2 } from './types';

type Wave = number[];
type FourierFn = (x: number, iterations: number) => number;

const square: FourierFn = (x, iterations): number => {
  let value = 0;

  for (let i = 0; i < iterations; i++) {
    const t = i * 2 + 1;

    value += Math.sin(t * x) / t;
  }

  return value;
};

const createFourierSeries = (fn: FourierFn, size: number, iterations: number): Wave => {
  return new Array(size).fill(0).map((_, index) => fn((index / size) * Math.PI * 2, iterations));
};

const squareWave = createFourierSeries(square, 50, 50);
// const sine: Wave = new Array(20).fill(0).map((_, index) => Math.sin(Math.PI * index / 20));

/**
 * @internal
 */
function createSynth(position: Vec2, area: Vec2): PeriodicWave {
  const xr = position.x / area.x;
  const yr = position.y / area.y;

  const real = squareWave;// new Array(100).fill(0).map((_, index) => Math.sin(Math.PI * index / 100 + xr));
  const imaginary = real.map(() => 0);

  return audio.getContext().createPeriodicWave(real, imaginary);
}

export function createSynthCreator(): HTMLDivElement {
  const root = document.createElement('div');
  const canvas = document.createElement('canvas');

  let mousedown = false;
  let sample: Sound = null;

  function startSample() {
    if (sample) {
      stopSample();
    }
    
    sample = audio.createSound('electricPiano', MIDDLE_NOTE);
  }

  function stopSample() {
    if (sample) {
      audio.endSound(sample);
    }

    sample = null;
  }

  canvas.addEventListener('mousedown', e => {
    mousedown = true;

    startSample();

    const bounds = canvas.getBoundingClientRect();

    const position: Vec2 = {
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top
    };

    // sample.node.setPeriodicWave(createSynth(position, { x: bounds.width, y: bounds.height }));

    e.stopPropagation();
  });

  canvas.addEventListener('mouseleave', e => {
    mousedown = false;

    stopSample();
    e.stopPropagation();
  });

  canvas.addEventListener('mouseup', e => {
    mousedown = false;

    stopSample();
    e.stopPropagation();
  });

  canvas.addEventListener('mousemove', e => {
    if (mousedown) {
      const bounds = canvas.getBoundingClientRect();

      const position: Vec2 = {
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top
      };

      // sample.node.setPeriodicWave(createSynth(position, { x: bounds.width, y: bounds.height }));
    }

    e.stopPropagation();
  });

  root.classList.add('synth-creator');

  root.appendChild(canvas);

  clearCanvas(canvas, canvas.getContext('2d'));

  return root;
}