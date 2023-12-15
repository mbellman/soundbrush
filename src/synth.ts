import { State } from './types';
import { createChannelPanel } from './ui/channel-panel';
import { createTemplate } from './ui/create-widget';

// @todo rename createChannelManager
export function createSynthCreator(state: State) {
  const { root, list, addButton } = createTemplate(`
    <div class="channel-manager">
      <div @list></div>
      <button @addButton class="channel-manager--add-channel-button">
        +
      </button>
    </div>
  `);

  function collapseAllChannels() {
    root.querySelectorAll('.channel-panel').forEach(element => {
      element.classList.remove('expanded');
      element.classList.add('collapsed');
    });
  }

  function expandChannel(element: HTMLDivElement) {
    collapseAllChannels();

    element.classList.add('expanded');
    element.classList.remove('collapsed');
  }

  list.appendChild(createChannelPanel(state, {
    name: 'Channel X',
    onExpand: expandChannel
  }));

  addButton.addEventListener('click', () => {
    collapseAllChannels();

    list.appendChild(createChannelPanel(state, {
      name: 'Channel X',
      onExpand: expandChannel
    }));
  });

  document.body.appendChild(root);

  return root;
}