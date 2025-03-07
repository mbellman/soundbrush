import { Sound } from '../audio';
import * as audio from '../audio';
import { clearCanvas } from '../canvas';
import { MIDDLE_NOTE } from '../constants';
import { samples } from '../samples';
import { createSlider } from './slider';
import { State, Vec2 } from '../types';
import { createTemplate, createWidget } from './create-widget';
import { ChannelConfig } from '../Sequence';
import './channel-panel.scss';

interface ChannelPanelConfig {
  name: string
  onExpand: (element: HTMLElement) => void
  onChangeChannelName: (name: string) => void
  onChangeChannelConfig: (config: Partial<ChannelConfig>) => void
}

export function createChannelPanel(config: ChannelPanelConfig) {
  const { root, nameInput, canvas } = createTemplate(`
    <div class="channel-panel expanded">
      <div class="channel-panel--header">
        <input
          @nameInput
          type="text"
          class="channel-panel--name-input"
          value='${config.name}'
        ></input>
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

  function isCollapsed() {
    return root.classList.contains('collapsed');
  }

  nameInput.addEventListener('keydown', e => {
    e.stopPropagation();
  });

  nameInput.addEventListener('keyup', e => {
    config.onChangeChannelName((nameInput as HTMLInputElement).value);

    if (e.key === 'Enter') {
      nameInput.blur();
    }

    e.stopPropagation();
  });

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

  root.addEventListener('click', () => {
    if (isCollapsed()) {
      config.onExpand(root);
    }
  });

  // root.addEventListener('mousemove', e => e.stopPropagation());

  root.addEventListener('mouseenter', () => {
    if (isCollapsed()) {
      // @todo ui.setChannelOpacity(channelId, 0.5)
      const channelId = root.getAttribute('data-channelId');
      const noteContainer = document.querySelector('.note-container').querySelector(`[data-channelId="${channelId}"]`) as HTMLElement;

      noteContainer.style.opacity = '0.5';
    }
  });

  root.addEventListener('mouseleave', () => {
    if (isCollapsed()) {
      // @todo ui.setChannelOpacity(channelId, 0.2)
      const channelId = root.getAttribute('data-channelId');
      const noteContainer = document.querySelector('.note-container').querySelector(`[data-channelId="${channelId}"]`) as HTMLElement;

      noteContainer.style.opacity = '0.2';
    }
  });

  root.appendChild(createSlider({
    label: 'Volume',
    defaultValue: 1,
    onChange: volume => config.onChangeChannelConfig({ volume })
  }));

  root.appendChild(createSlider({
    label: 'Attack',
    onChange: attack => config.onChangeChannelConfig({ attack: Math.pow(attack, 3) })
  }));

  root.appendChild(createSlider({
    label: 'Release',
    onChange: release => config.onChangeChannelConfig({ release })
  }));

  root.appendChild(createSlider({
    label: 'Reverb',
    onChange: reverb => config.onChangeChannelConfig({ reverb })
  }));

  // @todo avoid casting
  clearCanvas(canvas as HTMLCanvasElement, (canvas as HTMLCanvasElement).getContext('2d'));

  return root;
}