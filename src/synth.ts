import { clearCanvas } from './canvas';
import type { Sound } from './audio';
import * as audio from './audio';
import { MIDDLE_NOTE } from './constants';
import { State, Vec2 } from './types';
import { samples } from './samples';
import { clamp } from './utilities';

interface SliderConfig {
  label: string
  onChange: (value: number) => void
}

/**
 * @todo move to widgets.ts
 * @internal
 */
function createSlider(config: SliderConfig) {
  const slider = document.createElement('div');
  const label = document.createElement('div');
  const bar = document.createElement('div');
  const knob = document.createElement('div');

  slider.classList.add('slider');
  label.classList.add('slider--label');
  bar.classList.add('slider--bar');
  knob.classList.add('slider--knob');

  label.innerHTML = config.label;

  slider.appendChild(label);
  slider.appendChild(bar);
  slider.appendChild(knob);

  let dragging = false;
  let centerOffsetX: number;

  knob.addEventListener('mousedown', e => {
    const knobBounds = knob.getBoundingClientRect();
    
    dragging = true;
    centerOffsetX = e.clientX - (knobBounds.left + knobBounds.width / 2);
  });

  document.addEventListener('mousemove', e => {
    if (dragging) {
      const barBounds = bar.getBoundingClientRect();
      const knobBounds = knob.getBoundingClientRect();
      const min = 0;
      const max = barBounds.width - knobBounds.width;
      const knobX = clamp(e.clientX - barBounds.left - centerOffsetX - knobBounds.width / 2, min, max);
      const value = knobX / (barBounds.width - knobBounds.width);

      knob.style.transform = `translateX(${knobX}px) translateY(-11px)`;

      config.onChange(value);
    }
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
  });

  return slider;
}

export function createSynthCreator(state: State): HTMLDivElement {
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

  const { sequence } = state;

  root.appendChild(createSlider({
    label: 'Attack',
    onChange: attack => {
      sequence.updateChannelConfiguration(state.selectedInstrument, {
        attack
      });
    }
  }));

  root.appendChild(createSlider({
    label: 'Release',
    onChange: release => {
      sequence.updateChannelConfiguration(state.selectedInstrument, {
        release
      });
    }
  }));

  root.appendChild(createSlider({
    label: 'Reverb',
    onChange: reverb => {
      sequence.updateChannelConfiguration(state.selectedInstrument, {
        reverb
      });
    }
  }));

  clearCanvas(canvas, canvas.getContext('2d'));

  return root;
}