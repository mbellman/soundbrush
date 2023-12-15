import { clearCanvas } from './canvas';
import type { Sound } from './audio';
import * as audio from './audio';
import { MIDDLE_NOTE } from './constants';
import { State, Vec2 } from './types';
import { samples } from './samples';
import { createSlider } from './ui/slider';


/**
 * @todo move to widgets/channel-panel.ts
 */
interface ChannelPanelConfig {
  name: string
  onClickExpand: (element: HTMLDivElement) => void
}

function createChannelPanel(state: State, config: ChannelPanelConfig): HTMLDivElement {
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

  root.classList.add('synth-creator', 'expanded');

  const header = document.createElement('div');

  header.classList.add('synth-creator--header');

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

function createAddChannelButton(state: State) {
  const button = document.createElement('button');

  button.classList.add('channel-list--add-channel-button');
  button.innerHTML = '+';

  return button;
}

// @todo rename createChannelList
export function createSynthCreator(state: State): HTMLDivElement {
  const channelList = document.createElement('div');

  function collapseAllChannels() {
    channelList.querySelectorAll('.synth-creator').forEach(element => {
      element.classList.remove('expanded');
      element.classList.add('collapsed');
    });
  }

  function expandChannel(element: HTMLDivElement) {
    collapseAllChannels();

    element.classList.add('expanded');
    element.classList.remove('collapsed');
  }

  channelList.classList.add('channel-list');

  channelList.appendChild(createChannelPanel(state, {
    name: 'Channel X',
    onClickExpand: expandChannel
  }));

  channelList.appendChild(createAddChannelButton(state));

  // @todo cleanup
  channelList.querySelector('.channel-list--add-channel-button').addEventListener('click', () => {
    collapseAllChannels();

    channelList.appendChild(createChannelPanel(state, {
      name: 'Channel X',
      onClickExpand: expandChannel
    }));
  });

  document.body.appendChild(channelList);

  return channelList;
}