import { Sound } from '../audio';
import * as audio from '../audio';
import { clearCanvas } from '../canvas';
import { MIDDLE_NOTE } from '../constants';
import { samples } from '../samples';
import { createSlider } from './slider';
import { State, Vec2 } from '../types';
import { createWidget } from './create-widget';
import './channel-panel.scss';

/**
 * @todo move to widgets/channel-panel.ts
 */
interface ChannelPanelConfig {
  name: string
  onClickExpand: (element: HTMLDivElement) => void
}

export function createChannelPanel(state: State, config: ChannelPanelConfig): HTMLDivElement {
  const panel = createWidget('div', {
    template: `
      <div class="channel-panel">
        <div class="channel-panel--header">
          ${config.name}
        </div>
        <canvas></canvas>
      </div>
    `
  });

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

  root.classList.add('channel-panel', 'expanded');

  const header = document.createElement('div');

  header.classList.add('channel-panel--header');

  header.innerHTML = config.name;

  root.appendChild;
  root.appendChild(header);
  root.appendChild(canvas);

  // @temporary
  root.addEventListener('click', () => {
    if (root.classList.contains('collapsed')) {
      config.onClickExpand(root);
    }
  });

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