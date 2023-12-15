import { State } from './types';
import { createChannelPanel } from './ui/channel-panel';

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
    channelList.querySelectorAll('.channel-panel').forEach(element => {
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