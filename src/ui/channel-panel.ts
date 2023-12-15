import { Sound } from '../audio';
import * as audio from '../audio';
import { clearCanvas } from '../canvas';
import { MIDDLE_NOTE } from '../constants';
import { samples } from '../samples';
import { createSlider } from './slider';
import { State, Vec2 } from '../types';
import { createTemplate, createWidget } from './create-widget';
import './channel-panel.scss';

interface ChannelPanelConfig {
  name: string
  onExpand: (element: HTMLElement) => void
}

export function createChannelPanel(state: State, config: ChannelPanelConfig) {
  const { root, canvas } = createTemplate(`
    <div class="channel-panel expanded">
      <div class="channel-panel--header">
        ${config.name}
      </div>
      <canvas @canvas></canvas>
    </div>
  `);

  let mousedown = false;
  let sample: Sound = null;

  function startSample() {
    if (sample) {
      stopSample();
    }
    
    sample = audio.createSound(samples.square, MIDDLE_NOTE);

    // sample._gain.gain.value = 1;
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

  const { sequence } = state;

  root.addEventListener('click', () => {
    if (root.classList.contains('collapsed')) {
      config.onExpand(root);
    }
  });

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

  // @todo avoid casting
  clearCanvas(canvas as HTMLCanvasElement, (canvas as HTMLCanvasElement).getContext('2d'));

  return root;
}