import { clearCanvas } from './canvas';
import type { Sound } from './audio';
import * as audio from './audio';
import { MIDDLE_NOTE } from './constants';
import { Vec2 } from './types';
import { samples } from './samples';

/**
 * @internal
 */
function createSlider() {
  const slider = document.createElement('div');
  const bar = document.createElement('div');
  const knob = document.createElement('div');

  slider.classList.add('slider');
  bar.classList.add('slider--bar');
  knob.classList.add('slider--knob');

  slider.appendChild(bar);
  slider.appendChild(knob);

  return slider;
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
    
    sample = audio.createSound(samples.sine, MIDDLE_NOTE);
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

    // @todo update sample buffer

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

      // @todo update sample buffer
    }

    e.stopPropagation();
  });

  root.classList.add('synth-creator');

  root.appendChild(canvas);

  // @temporary
  root.appendChild(createSlider());
  root.appendChild(createSlider());

  clearCanvas(canvas, canvas.getContext('2d'));

  return root;
}